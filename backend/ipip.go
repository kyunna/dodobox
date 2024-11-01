package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

type Client struct {
	httpClient *http.Client
	Request    *http.Request
	cache      *Cache
}

type QueryResult struct {
	Data Data `json:"data"`
}

type Data struct {
	IPAddress            string   `json:"ipAddress"`
	IsPublic             bool     `json:"isPublic"`
	IPVersion            int64    `json:"ipVersion"`
	IsWhitelisted        bool     `json:"isWhitelisted"`
	AbuseConfidenceScore int64    `json:"abuseConfidenceScore"`
	CountryCode          string   `json:"countryCode"`
	UsageType            string   `json:"usageType"`
	ISP                  string   `json:"isp"`
	Domain               string   `json:"domain"`
	Hostnames            []string `json:"hostnames"`
	CountryName          string   `json:"countryName"`
	TotalReports         int64    `json:"totalReports"`
	NumDistinctUsers     int64    `json:"numDistinctUsers"`
	LastReportedAt       string   `json:"lastReportedAt"`
	Reports              []Report `json:"reports"`
}

type Report struct {
	ReportedAt          string  `json:"reportedAt"`
	Comment             string  `json:"comment"`
	Categories          []int64 `json:"categories"`
	ReporterID          int64   `json:"reporterId"`
	ReporterCountryCode string  `json:"reporterCountryCode"`
	ReporterCountryName string  `json:"reporterCountryName"`
}

type IP struct {
	IP string `json:"ip"`
}

// Cache structure
type CacheItem struct {
	Result    QueryResult
	Timestamp time.Time
}

type Cache struct {
	items map[string]CacheItem
	mutex sync.RWMutex
}

// Cache methods
func NewCache() *Cache {
	cache := &Cache{
		items: make(map[string]CacheItem),
	}

	// Start cache cleanup routine
	go cache.cleanup()

	return cache
}

func (c *Cache) Set(key string, result QueryResult) {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.items[key] = CacheItem{
		Result:    result,
		Timestamp: time.Now(),
	}
}

func (c *Cache) Get(key string) (QueryResult, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return QueryResult{}, false
	}

	// Check if cache is still valid (1 hour)
	if time.Since(item.Timestamp) > time.Hour {
		delete(c.items, key)
		return QueryResult{}, false
	}

	return item.Result, true
}

func (c *Cache) cleanup() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, item := range c.items {
			if now.Sub(item.Timestamp) > time.Hour {
				delete(c.items, key)
			}
		}
		c.mutex.Unlock()
	}
}

// Create client for api.abuseipdb.com
func NewClient(apiKey string) (*Client, error) {
	client := Client{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		Request: &http.Request{
			Method: "GET",
			URL: &url.URL{
				Scheme: "https",
				Host:   "api.abuseipdb.com",
				Path:   "/api/v2",
			},
			Header: http.Header{
				"Accept": []string{"application/json"},
				"Key":    []string{apiKey},
			},
		},
		cache: NewCache(),
	}

	return &client, nil
}

// Check endpoint
func (c *Client) Check(ip string, remoteAddr string) (QueryResult, error) {
	// Check cache first
	if result, found := c.cache.Get(ip); found {
		log.Printf("Cache hit for IP: %s", ip)
		return result, nil
	}

	apiPath := "/check"
	result := QueryResult{}

	// Create a new request for each call
	req := &http.Request{
		Method: "GET",
		URL: &url.URL{
			Scheme: "https",
			Host:   "api.abuseipdb.com",
			Path:   "/api/v2" + apiPath,
		},
		Header: http.Header{
			"Accept": []string{"application/json"},
			"Key":    []string{c.Request.Header.Get("Key")},
		},
	}

	// Make query
	query := req.URL.Query()
	query.Add("ipAddress", ip)
	query.Add("maxAgeInDays", "90")
	query.Add("verbose", "")

	req.URL.RawQuery = query.Encode()

	// Do query
	response, err := c.httpClient.Do(req)
	if err != nil {
		return result, err
	}
	defer response.Body.Close()

	// Handling query results
	log.Printf("Cache miss for IP: %s", ip)
	log.Print(remoteAddr + "\t" + apiPath + "\t" + ip)

	bytes, err := io.ReadAll(response.Body)
	if err != nil {
		return result, err
	}

	if err := json.Unmarshal(bytes, &result); err != nil {
		return result, err
	}

	// Check requests limit
	if response.Header.Get("X-RateLimit-Remaining") == "0" {
		log.Print("The request limit has been reached.")
	}

	// HTTP status code is not 200
	if response.StatusCode != 200 {
		return result, fmt.Errorf("API error: %s", string(bytes))
	}

	// Store successful result in cache
	c.cache.Set(ip, result)

	return result, nil
}

func main() {
	// Get an API key
	err := godotenv.Load()

	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// Create a new client
	client, err := NewClient(os.Getenv("ABUSEIPDB_KEY"))
	if err != nil {
		log.Fatal("Error creating new client")
	}

	// Run the reputation check RestAPI Server
	e := echo.New()

	// Development 환경에서는 HTTPS 리다이렉트와 CORS 설정을 다르게 적용
	if os.Getenv("ENV") != "development" {
		e.Use(middleware.HTTPSRedirect())
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{"https://dodobox.pppp.page"},
			AllowMethods: []string{echo.GET, echo.POST},
		}))
	} else {
		e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
			AllowOrigins: []string{"http://localhost:3000"},
			AllowMethods: []string{echo.GET, echo.POST},
		}))
	}

	e.Use(middleware.Recover())

	// Single IP Check
	e.POST("/check/endpoint", func(c echo.Context) (err error) {
		// Checking for IP in JSON data
		postData := new(IP)
		if err = c.Bind(postData); err != nil {
			log.Print(err)
			return c.String(http.StatusBadRequest, "Bad request")
		}

		// Abuse score query
		result, err := client.Check(postData.IP, c.Request().RemoteAddr)
		if err != nil {
			log.Print(err)
			return c.String(http.StatusInternalServerError, "Query error : "+err.Error())
		}

		return c.JSON(http.StatusOK, result)
	})

	// 환경에 따라 다른 서버 시작 방식 사용
	if os.Getenv("ENV") == "development" {
		e.Logger.Fatal(e.Start(":" + os.Getenv("PORT")))
	} else {
		e.Logger.Fatal(e.StartTLS(
			":"+os.Getenv("PORT"),
			os.Getenv("CERT"),
			os.Getenv("KEY"),
		))
	}
}
