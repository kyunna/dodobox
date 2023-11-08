import React, { useState, } from 'react';
import axios from 'axios';
import Textarea from '@mui/joy/Textarea';
import Button from '@mui/joy/Button';
import Table from '@mui/joy/Table';
import Grid from '@mui/joy/Grid';
import FlutterDashIcon from '@mui/icons-material/FlutterDash';
import { CssVarsProvider, extendTheme } from '@mui/joy/styles';

const dodoTheme = extendTheme({
  components: {
    JoyButton: {
      variants: [ { props: {}, style: { fontFamily: 'Varela Round', }, }, ],
    },
    JoyTextarea: {
      variants: [ { props: {}, style: { fontFamily: 'Varela Round', }, }, ],
    },
    JoyTable: {
      variants: [ { props: {}, style: { fontFamily: 'Varela Round', }, }, ],
    },
  },
});

export default function Dodobox() {
  const [dodoboxValue, setdodoboxValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState([]);
  const [processItems, setProcessItems] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  const dodoboxValueChange = (event) => {
    setdodoboxValue(event.target.value);
  };

  const handleQueryButtonClick = async () => {
    setResponseData([]);
    setProcessItems(0);
    setItemCount(0);
    setLoading(true);
    
    const apiURL = process.env.REACT_APP_ABUSE_API_URL;

    const lines = dodoboxValue.split('\n');

    setItemCount(countItems(lines));

    for (const line of lines) {
      if (line.trim() !== '') {
        try{
          const response = await axios.post(apiURL, {
            ip: line.trim()
          });
          // console.log('API Response for IP', line.trim(), ':', response.data);
          setResponseData((prevData) => [...prevData, response.data]);
          setProcessItems((prevItems) => prevItems + 1);
          /*
          1) `prevData` is the previous state of the `responseData` array. It contains the data of the previously received API responses.
          2) `[...prevData]` uses the spread operator (...) to create a new array with all the elements of the prevData array. This is a way to clone the original array.
          3) `,` separates the elements in the new array.
          4) `response.data` is the new API response data that you received from the server.

          By combining these elements, the line effectively creates a new array that contains all the previous elements from `prevData` and adds the new `response.data` object as a new element at the end of the new array.

          Why use this approach?

          When you call `setResponseData`, React will compare the new array returned by the function with the previous `responseData` state. Since the new array is different from the previous one, React will recognize the state update and trigger a re-render of the component. This is how React ensures that the component reflects the updated state correctly.

          By creating a new array instead of modifying the existing `prevData` array directly, you maintain immutability. React can efficiently detect the state change and optimize re-renders based on the shallow comparison of the array references.

          Overall, this approach helps you maintain a clear and predictable state flow, ensuring that the component reflects the latest API responses without losing any previously received data.
          */
        } catch (error) {
          console.log(error);
        }
      }
    }
    setLoading(false);
  };

  return (
    <CssVarsProvider theme={dodoTheme}>
      <Grid container spacing={1} alignItems="center">
        <Grid xs={12}>
          <Textarea
            placeholder="Type in here… "
            minRows={7}
            maxRows={7}
            value={dodoboxValue}
            onChange={dodoboxValueChange}
          />
        </Grid>
        <Grid xs={12} sm={6}>
          {loading ? (
            <Button loading loadingPosition="start"> {processItems} / {itemCount} </Button>
          ) : (
            <Button startDecorator={<FlutterDashIcon />} onClick={handleQueryButtonClick}> Query </Button>
          )}
        </Grid>
        <Grid xs={12}>
          {responseData && responseData.length > 0 && (
            <Table hoverRow stickyHeader>
              <thead>
                <tr>
                  <th style={{ width:'130px' }}>IP Address</th>
                  <th style={{ width:'130px', textAlign:'center' }}>Abuse Score</th>
                  <th style={{ width:'40%' }}>Country</th>
                  <th style={{ width:'40%' }}>ISP</th>
                  <th style={{ width:'40%' }}>Domain</th>
                </tr>
              </thead>
              <tbody>
                {responseData.map((response, index) => (
                  <tr key={index}>
                    <td>{response.data.ipAddress}</td>
                    <td style={{textAlign:'center'}}>{response.data.abuseConfidenceScore}</td>
                    <td>{response.data.countryName}</td>
                    <td>{response.data.isp}</td>
                    <td>{response.data.domain}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Grid>
      </Grid>
    </CssVarsProvider>
  );
}

function countItems(data) {
  let count = 0;
  for (const item of data) {
    if (item.trim() !== '') {
      count++;
    }
  }
  return count;
}