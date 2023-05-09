async function processCSVs() {
    const csv1Input = document.getElementById("csvFile1");
    const csv2Input = document.getElementById("csvFile2");
  
    if (!csv1Input.files.length || !csv2Input.files.length) {
      alert("Please select both CSV files.");
      return;
    }
  
    const csv1Content = await readFileAsync(csv1Input.files[0]);
    const csv2Content = await readFileAsync(csv2Input.files[0]);
  
    const csv1Data = parseCSV(csv1Content);
    const csv2Data = parseCSV(csv2Content);
    const csv1Header = csv1Data.shift();
    const csv2Header = csv2Data.shift();
  
    const percentageMap = new Map();
    const processedApps = new Set();
    for (const row of csv2Data) {
      percentageMap.set(row[0] + "_" + row[1], parseFloat(row[2]));
    }
  
    const resultData = [csv1Header];
for (const row of csv1Data) {
  const adSetId = row[0];
  const publisherAppId = row[2];
  const eventName = row[5];
  const key = adSetId + "_" + publisherAppId;

  processedApps.add(key);

  const newRow = [...row];
  newRow[4] = " ";

  let percentage;
  if (percentageMap.has(key)) {
    percentage = percentageMap.get(key);
  } else if (publisherAppId === 'DEFAULT_PER_APP_BID_GROUP_ID' && percentageMap.has(adSetId + "_DEFAULT_PER_APP_BID_GROUP_ID")) {
    percentage = percentageMap.get(adSetId + "_DEFAULT_PER_APP_BID_GROUP_ID");
  }

  if (percentage !== undefined) {
    const oldBid = parseFloat(newRow[7]);
    const newBid = calculateModifiedBid(percentage, oldBid);
    newRow[7] = newBid.toFixed(3);
  }

  resultData.push(newRow);
}

  
    // Add rows from the second CSV that are not in the first CSV
    const rowsToAdd = [];
    for (const row of csv2Data) {
        const adSetId = row[0];
        const publisherAppId = row[1];
        const percentage = parseFloat(row[2]);

        // Get all events with the same Ad Set ID and DEFAULT_PER_APP_BID_GROUP_ID
        const defaultBidEvents = csv1Data.filter(row => row[0] === adSetId && row[2] === 'DEFAULT_PER_APP_BID_GROUP_ID');

        for (const eventRow of defaultBidEvents) {
            const eventName = eventRow[5];
            if (!publisherAppIdInResult(adSetId, publisherAppId, eventName, resultData)) {
                const newRow = [...eventRow];
                newRow[3] = 'ANDROID';
                newRow[2] = publisherAppId;
                const oldBid = parseFloat(newRow[7]);
                const newBid = calculateModifiedBid(percentage, oldBid);
                newRow[7] = newBid.toFixed(3);

                rowsToAdd.push(newRow);
            }
        }
    }

    // Add the rows to resultData
    for (const row of rowsToAdd) {
        resultData.push(row);
    }
  
    const resultCSV = generateCSV(resultData);
    downloadCSV(resultCSV, "result.csv");
  }
  
  function downloadDefaultCSV() {
    const lines = ["Ad Set ID,Publisher App ID,Percentage"];
    const csvContent = lines.join('\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
  
    downloadLink.href = url;
    downloadLink.download = "default.csv";
    downloadLink.style.display = "none";
  
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }
  const defaultCSVButton = document.getElementById("defaultCSVButton");
defaultCSVButton.addEventListener("click", downloadDefaultCSV);



function publisherAppIdInResult(adSetId, publisherAppId, eventName, resultData) {
    return resultData.some(row => row[0] === adSetId && row[2] === publisherAppId && row[5] === eventName);
}

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

function parseCSV(csvString) {
    const lines = csvString.trim().split('\n');
    const data = lines.map(line => {
      let inQuotes = false;
      let field = '';
      const row = [];
  
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
  
        if (inQuotes) {
          if (char === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              // Handle double quotes inside a quoted field
              field += char;
              i++; // Skip the next character
            } else {
              // Close the quoted field
              inQuotes = false;
            }
          } else {
            field += char;
          }
        } else {
          if (char === '"') {
            // Start a quoted field
            inQuotes = true;
          } else if (char === ',') {
            // End of the current field
            row.push(field);
            field = '';
          } else {
            field += char;
          }
        }
      }
  
      // Add the last field
      row.push(field);
  
      return row;
    });
  
    return data;
  }
  

function calculateModifiedBid(percentage, originalBid) {
    return percentage * originalBid / 100;
}
function generateCSV(dataArray) {
    const lines = dataArray.map(row => {
      const formattedRow = row.map(field => {
        if (typeof field === 'string') {
          // Escape any double quotes within the field
          const escapedField = field.replace(/"/g, '""');
  
          // If the field contains a comma or a double quote, wrap it in double quotes
          if (escapedField.includes(',') || escapedField.includes('"')) {
            return '"' + escapedField + '"';
          }
        }
        return field;
      });
      return formattedRow.join(',');
    });
    const csvContent = lines.join('\n');
    return csvContent;
  }
  

function downloadCSV(csvData) {
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = url;
    downloadLink.download = "processed.csv";
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}
