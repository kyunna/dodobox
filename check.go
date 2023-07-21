package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
)

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

// Check endpoint
func (c *Client) Check(ip string, remoteAddr string) (QueryResult, error) {
	apiPath := "/check"
	result := QueryResult{}

	// Check endpoint API url
	c.Request.URL.Path = c.Request.URL.Path + apiPath

	// Make query
	query := c.Request.URL.Query()
	query.Add("ipAddress", ip)
	query.Add("maxAgeInDays", "90")
	query.Add("verbose", "")

	c.Request.URL.RawQuery = query.Encode()

	// Do query
	response, err := c.httpClient.Do(c.Request)
	if err != nil {
		return result, err
	}
	defer response.Body.Close()

	// Reset url and query
	c.Request.URL.RawQuery = ""
	c.Request.URL.Path = strings.ReplaceAll(c.Request.URL.Path, apiPath, "")

	log.Print(remoteAddr + "\t" + apiPath + "\t" + ip)

	bytes, err := io.ReadAll(response.Body)
	if err != nil {
		return result, err
	}

	if err := json.Unmarshal(bytes, &result); err != nil {
		return result, err
	}

	if response.StatusCode != 200 {
		fmt.Println(string(bytes))
	}

	return result, nil
}
