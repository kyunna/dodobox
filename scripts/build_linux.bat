SET GOOS=linux
SET GOARCH=amd64
go build -ldflags "-s -w" -o ../release/ipip ../ipip.go ../check.go