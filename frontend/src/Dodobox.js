import React, { useState } from 'react';
import axios from 'axios';
import { 
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  Paper,
  ThemeProvider,
  createTheme,
  LinearProgress
} from '@mui/material';
import FlutterDashIcon from '@mui/icons-material/FlutterDash';
import CircularProgress from '@mui/material/CircularProgress';

const theme = createTheme({
  typography: {
    fontFamily: 'Varela Round',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Varela Round',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          fontFamily: 'Varela Round',
        },
      },
    },
  },
});

export default function Dodobox() {
  const [dodoboxValue, setdodoboxValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState([]);
  const [processItems, setProcessItems] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [errors, setErrors] = useState([]);
  const [progress, setProgress] = useState(0);

  const dodoboxValueChange = (event) => {
    setdodoboxValue(event.target.value);
  };

  const extractIPsFromLine = (line) => {
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const matches = line.match(ipRegex);
    return matches || [];
  };

  const validateIP = (ip) => {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;

    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  };

  const processBatch = async (ips, batchSize = 5) => {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const promises = batch.map(async ip => {
        if (!validateIP(ip)) {
          return {
            data: {
              ipAddress: ip,
              abuseConfidenceScore: '-',
              countryName: '-',
              isp: 'Invalid IP Format',
              domain: '-'
            },
            error: true
          };
        }
        
        try {
          const response = await axios.post('/check/endpoint', { ip });
          if (response.data && response.data.data) {
            return {
              data: response.data.data,
              error: false
            };
          } else {
            throw new Error('Invalid response format');
          }
        } catch (error) {
          console.error('Error processing IP:', ip, error);
          return {
            data: {
              ipAddress: ip,
              abuseConfidenceScore: '-',
              countryName: '-',
              isp: `Error: ${error.response?.data?.errors?.[0]?.detail || error.message}`,
              domain: '-'
            },
            error: true
          };
        }
      });

      try {
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
        
        const currentProgress = Math.min(((i + batch.length) / ips.length) * 100, 100);
        setProgress(currentProgress);
        setProcessItems(results.length);
        
        batchResults.forEach(result => {
          if (result.error) {
            errors.push(`Error processing ${result.data.ipAddress}: ${result.data.isp}`);
          }
        });

        setResponseData([...results]);
        if (errors.length > 0) {
          setErrors([...errors]);
        }
        
        if (i + batchSize < ips.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        errors.push(`Batch processing error: ${error.message}`);
      }
    }
    
    return { results, errors };
  };

  const handleQueryButtonClick = async () => {
    try {
      setResponseData([]);
      setProcessItems(0);
      setErrors([]);
      setItemCount(0);
      setProgress(0);
      setLoading(true);

      const extractedIPs = dodoboxValue
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '')
        .flatMap(line => extractIPsFromLine(line))
        .filter(ip => ip !== null);

      setItemCount(extractedIPs.length);

      if (extractedIPs.length === 0) {
        setErrors(['No valid IP addresses found in the input']);
        return;
      }

      const { results, errors } = await processBatch(extractedIPs);
      
      setResponseData(results);
      if (errors.length > 0) {
        setErrors(errors);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      setErrors(prev => [...prev, 'An unexpected error occurred']);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            multiline
            rows={7}
            fullWidth
            placeholder="Type in here..."
            value={dodoboxValue}
            onChange={dodoboxValueChange}
            variant="outlined"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            color="primary"
            disabled={loading}
            onClick={handleQueryButtonClick}
            startIcon={loading ? <CircularProgress size={20} /> : <FlutterDashIcon />}
          >
            {loading ? `${processItems}/${itemCount} (${Math.round(progress)}%)` : 'Query'}
          </Button>
        </Grid>
        {loading && (
          <Grid item xs={12}>
            <LinearProgress 
              variant="determinate" 
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                }
              }}
            />
          </Grid>
        )}
        {errors.length > 0 && (
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                bgcolor: '#fff3f3', 
                p: 2, 
                border: '1px solid #ffcdd2'
              }}
            >
              {errors.map((error, index) => (
                <div key={index} style={{ color: '#d32f2f', marginBottom: '4px' }}>
                  {error}
                </div>
              ))}
            </Paper>
          </Grid>
        )}
        <Grid item xs={12}>
          {responseData && responseData.length > 0 && (
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ width: '130px' }}>IP Address</TableCell>
                    <TableCell style={{ width: '130px', textAlign: 'center' }}>Abuse Score</TableCell>
                    <TableCell style={{ width: '40%' }}>Country</TableCell>
                    <TableCell style={{ width: '40%' }}>ISP</TableCell>
                    <TableCell style={{ width: '40%' }}>Domain</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {responseData.map((response, index) => (
                    <TableRow 
                      key={index} 
                      hover
                      sx={{
                        backgroundColor: response.error ? '#fff3f3' : 'inherit',
                        '&:hover': {
                          backgroundColor: response.error ? '#ffe9e9' : undefined
                        }
                      }}
                    >
                      <TableCell>{response.data.ipAddress}</TableCell>
                      <TableCell style={{
                        textAlign: 'center',
                        color: response.error ? '#d32f2f' : 
                          response.data.abuseConfidenceScore >= 80 ? '#d32f2f' :
                          response.data.abuseConfidenceScore >= 50 ? '#ed6c02' : '#2e7d32'
                      }}>
                        {response.data.abuseConfidenceScore}
                      </TableCell>
                      <TableCell>{response.data.countryName || '-'}</TableCell>
                      <TableCell>{response.data.isp || '-'}</TableCell>
                      <TableCell>{response.data.domain || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </ThemeProvider>
  );
}