package main

import (
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v4"
)

type Client struct {
	httpClient *http.Client
	Request    *http.Request
}

type RequestOptions struct {
	Params  map[string]string
	Headers map[string]string
	Body    []byte
}

type IP struct {
	IP string `json:"ip"`
}

// Create client for api.abuseipdb.com
func NewClient(apiKey string) (*Client, error) {
	client := Client{
		httpClient: &http.Client{
			// Set a Timeout (https://jusths.tistory.com/203)
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
	}

	return &client, nil
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

	e.Logger.Fatal(e.Start(":" + os.Getenv("PORT")))
}
