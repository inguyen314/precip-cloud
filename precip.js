document.addEventListener('DOMContentLoaded', function () {
    // Display the loading_alarm_mvs indicator
    const loadingIndicator = document.getElementById('loading_precip');
    loadingIndicator.style.display = 'block';

    // Gage control json file
    let jsonFileURL = null;
    if (cda === "public") {
        jsonFileURL = '../../php_data_api/public/json/gage_control.json';
    } else if (cda === "internal") {
        jsonFileURL = '../../php_data_api/public/json/gage_control.json';
    }
    console.log('jsonFileURL: ', jsonFileURL);

    // Fetch JSON data from the specified URL
    fetch(jsonFileURL)
        .then(response => {
            // Check if response is OK, if not, throw an error
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            // Parse the response as JSON
            return response.json();
        })
        .then(data => {
            // Log the fetched data
            // console.log('data: ', data);

            // console.log('selectedBasin: ', selectedBasin);

            // Function to filter data for the "Big Muddy" basin
            function filterBasin(data) {
                return data.filter(entry => entry.basin === selectedBasin);
            }

            // Extracted data for the selected basin
            const basinData = filterBasin(data);

            // Print the extracted data for selected basin
            // console.log('basinData: ', basinData);

            // Filter the data
            const filteredData = filterLocations(basinData);

            // Convert the filtered data back to JSON format
            // console.log("filteredData = ", filteredData);

            // Call the function to create and populate the table
            createTable(filteredData);

            // Hide the loading_alarm_mvs indicator after the table is loaded
            loadingIndicator.style.display = 'none';
        })
        .catch(error => {
            // Log any errors that occur during fetching or parsing JSON
            console.error('Error fetching data:', error);
            // Hide the loading_alarm_mvs indicator if there's an error
            loadingIndicator.style.display = 'none';
        });
});

// Function to filter locations with report_precip === true
function filterLocations(data) {
    const filteredData = [];
    data.forEach(item => {
        const filteredItem = { basin: item.basin, gages: [] };
        item.gages.forEach(gage => {
            if (gage.report_precip === true) {
                filteredItem.gages.push(gage);
            }
        });
        if (filteredItem.gages.length > 0) { // At least one gage with report_precip === true
            filteredData.push(filteredItem);
        }
    });
    return filteredData;
}

// Function to create ld summary table
function createTable(filteredData) {
    // Create a table element
    const table = document.createElement('table');
    table.setAttribute('id', 'gage_data'); // Set the id to "gage_data"

    // console.log("filteredData inside createTable = ", filteredData);

    // Create a table header row
    const headerRow = document.createElement('tr');

    if (type === "inc") {
        // Create table headers for the desired columns
        const columns = ["River Mile", "Location", "06 hr.", "12 hr.", "18 hr.", "24 hr.", "30 hr.", "36 hr.", "42 hr.", "48 hr.", "54 hr.", "60 hr.", "66 hr.", "72 hr.", "Zero hr."];
        columns.forEach((columnName) => {
            const th = document.createElement('th');
            th.textContent = columnName;
            th.style.height = '50px';
            th.style.backgroundColor = 'darkblue'; // Set background color to dark blue
            headerRow.appendChild(th);
        });
    } else if (type === "cum") {
        // Create table headers for the desired columns
        const columns = ["River Mile", "Location", "06 hr.", "12 hr.", "24 hr.", "48 hr.", "72 hr.", "Zero hr."];
        columns.forEach((columnName) => {
            const th = document.createElement('th');
            th.textContent = columnName;
            th.style.height = '50px';
            th.style.backgroundColor = 'darkblue'; // Set background color to dark blue
            headerRow.appendChild(th);
        });
    }


    // Append the header row to the table
    table.appendChild(headerRow);

    // Append the table to the document or a specific container
    const tableContainer = document.getElementById('table_container_precip');
    if (tableContainer) {
        tableContainer.appendChild(table);
    }

    // Populate table cells asynchronously
    populateTableCells(filteredData, table);

}

// Function to populate table cells asynchronously
function populateTableCells(filteredData, table) {
    filteredData.forEach(basin => {
        basin.gages.forEach(location => {
            // console.log("Location ID:", location.location_id);
            // console.log("Order:", location.order);
            // console.log("TS ID:", location.tsid_precip_raw);
            // Access other properties of each location here
            // console.log();

            // Create a new row for each data object
            const row = table.insertRow();
            // console.log("Calling fetchAndUpdateData");
            fetchAndUpdateData(location.location_id, location.tsid_precip_raw, row, type, cda, location.river_mile_hard_coded);
        });
    });
}

// Function to fetch ld summary data
function fetchAndUpdateData(location_id, tsid, row, type, cda, river_mile_hard_coded) {
    const currentDateTime = new Date();
    const currentDateTimeMinus30Hours = subtractHoursFromDate(currentDateTime, 96);

    // Fetch the time series data from the API using the determined query string
    let urlStage = null;
    if (cda === "public") {
        urlStage = `https://cwms-data.usace.army.mil/cwms-data/timeseries?name=${tsid}&begin=${currentDateTimeMinus30Hours.toISOString()}&end=${currentDateTime.toISOString()}&office=MVS`;
    } else {
        urlStage = `https://coe-mvsuwa04mvs.mvs.usace.army.mil:8243/mvs-data/timeseries?name=${tsid}&begin=${currentDateTimeMinus30Hours.toISOString()}&end=${currentDateTime.toISOString()}&office=MVS`;
    }
    console.log("urlStage = ", urlStage);
    fetch(urlStage, {
        method: 'GET',
        headers: {
            'Accept': 'application/json;version=2'
        }
    })
        .then(response => {
            // Check if the response is ok
            if (!response.ok) {
                // If not, throw an error
                throw new Error('Network response was not ok');
            }
            // If response is ok, parse it as JSON
            return response.json();
        })
        .then(data => {
            console.log("data:", data);

            const extractedValues = calculateHourlyDifferences(data);
            // console.log("extractedValues: ", extractedValues);
            // console.log(extractedValues.results);
            // console.log(extractedValues.results[0]);
            // console.log(extractedValues.results[0].difference);

            // Log the last non-null value and its timestamp
            // console.log('Last Non-Null Value:', extractedValues.lastValue, 'at', extractedValues.lastDateTime);

            // Log the differences at specific intervals before the last timestamp
            extractedValues.results.forEach(result => {
                // console.log(`Difference ${result.hoursBefore} Hours Before:`, result.difference);
            });

            if (type === "inc") {
                if (data !== null) {
                    // RIVER MILE
                    const riverMileCell = row.insertCell();
                    if (river_mile_hard_coded !== null) {
                        riverMileCell.innerHTML = "<span class='hard_coded' title='Hard Coded in JSON, No Cloud Option Yet'>" + (parseFloat(river_mile_hard_coded)).toFixed(2) + "<span>";
                    } else {
                        riverMileCell.innerHTML = '<div style="background-color: orange;"></div>';
                    }

                    // LOCATION
                    const locationCell = row.insertCell();
                    locationCell.innerHTML = location_id;

                    // 06
                    const value06Cell = row.insertCell();
                    const delta6 = (extractedValues.results[0].difference).toFixed(2);
                    const myClass6 = setPrecipClass(delta6, "inc_6");
                    value06Cell.innerHTML = delta6;
                    value06Cell.classList.add(myClass6);

                    // 12
                    const value12Cell = row.insertCell();
                    const delta12 = (extractedValues.results[1].difference - extractedValues.results[0].difference).toFixed(2);
                    const myClass12 = setPrecipClass(delta12, "inc_12");
                    value12Cell.innerHTML = delta12;
                    value12Cell.classList.add(myClass12);

                    // 18
                    const value18Cell = row.insertCell();
                    const delta18 = (extractedValues.results[2].difference - extractedValues.results[1].difference).toFixed(2);
                    const myClass18 = setPrecipClass(delta18, "inc_18");
                    value18Cell.innerHTML = delta18;
                    value18Cell.classList.add(myClass18);

                    // 24
                    const value24Cell = row.insertCell();
                    const delta24 = (extractedValues.results[3].difference - extractedValues.results[2].difference).toFixed(2);
                    const myClass24 = setPrecipClass(delta24, "inc_24");
                    value24Cell.innerHTML = delta24;
                    value24Cell.classList.add(myClass24);

                    // 30
                    const value30Cell = row.insertCell();
                    const delta30 = (extractedValues.results[4].difference - extractedValues.results[3].difference).toFixed(2);
                    const myClass30 = setPrecipClass(delta30, "inc_30");
                    value30Cell.innerHTML = delta30;
                    value30Cell.classList.add(myClass30);

                    // 36
                    const value36Cell = row.insertCell();
                    const delta36 = (extractedValues.results[5].difference - extractedValues.results[4].difference).toFixed(2);
                    const myClass36 = setPrecipClass(delta36, "inc_36");
                    value36Cell.innerHTML = delta36;
                    value36Cell.classList.add(myClass36);

                    // 42
                    const value42Cell = row.insertCell();
                    const delta42 = (extractedValues.results[6].difference - extractedValues.results[5].difference).toFixed(2);
                    const myClass42 = setPrecipClass(delta42, "inc_42");
                    value42Cell.innerHTML = delta42;
                    value42Cell.classList.add(myClass42);

                    // 48
                    const value48Cell = row.insertCell();
                    const delta48 = (extractedValues.results[7].difference - extractedValues.results[6].difference).toFixed(2);
                    const myClass48 = setPrecipClass(delta48, "inc_48");
                    value48Cell.innerHTML = delta48;
                    value48Cell.classList.add(myClass48);

                    // 54
                    const value54Cell = row.insertCell();
                    const delta54 = (extractedValues.results[8].difference - extractedValues.results[7].difference).toFixed(2);
                    const myClass54 = setPrecipClass(delta54, "inc_54");
                    value54Cell.innerHTML = delta54;
                    value54Cell.classList.add(myClass54);

                    // 60
                    const value60Cell = row.insertCell();
                    const delta60 = (extractedValues.results[9].difference - extractedValues.results[8].difference).toFixed(2);
                    const myClass60 = setPrecipClass(delta60, "inc_60");
                    value60Cell.innerHTML = delta60;
                    value60Cell.classList.add(myClass60);

                    // 66
                    const value66Cell = row.insertCell();
                    const delta66 = (extractedValues.results[10].difference - extractedValues.results[9].difference).toFixed(2);
                    const myClass66 = setPrecipClass(delta66, "inc_66");
                    value66Cell.innerHTML = delta66;
                    value66Cell.classList.add(myClass66);

                    // 72
                    const value72Cell = row.insertCell();
                    const delta72 = (extractedValues.results[11].difference - extractedValues.results[10].difference).toFixed(2);
                    const myClass72 = setPrecipClass(delta72, "inc_72");
                    value72Cell.innerHTML = delta72;
                    value72Cell.classList.add(myClass72);

                    // Zero Hr
                    const zeroCell = row.insertCell();
                    // Format the lastDateTime
                    const formattedDateTime = extractedValues.lastDateTime.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false // Ensure 24-hour format
                    });

                    // Use a regular expression to replace the comma and space with a space
                    const formattedDateTimeWithSpace = formattedDateTime.replace(', ', ' ');

                    // Replace slashes with dashes
                    const finalFormattedDateTime = formattedDateTimeWithSpace.replace(/\//g, '-');

                    zeroCell.innerHTML = finalFormattedDateTime;
                } else {
                    // DATE TIME
                    const riverMileCell = row.insertCell();
                    if (river_mile_hard_coded !== null) {
                        riverMileCell.innerHTML = "<span class='hard_coded' title='Hard Coded in JSON, No Cloud Option Yet'>" + (parseFloat(river_mile_hard_coded)).toFixed(2) + "<span>";
                    } else {
                        riverMileCell.innerHTML = '<div style="background-color: orange;"></div>';
                    }

                    // LOCATION
                    const locationCell = row.insertCell();
                    locationCell.innerHTML = location_id;

                    // 06
                    const value06Cell = row.insertCell();
                    value06Cell.innerHTML = "-M-";

                    // 12
                    const value12Cell = row.insertCell();
                    value12Cell.innerHTML = "-M-";

                    // 18
                    const value18Cell = row.insertCell();
                    value18Cell.innerHTML = "-M-";

                    // 24
                    const value24Cell = row.insertCell();
                    value24Cell.innerHTML = "-M-";

                    // 30
                    const value30Cell = row.insertCell();
                    value30Cell.innerHTML = "-M-";

                    // 36
                    const value36Cell = row.insertCell();
                    value36Cell.innerHTML = "-M-";

                    // 42
                    const value42Cell = row.insertCell();
                    value42Cell.innerHTML = "-M-";

                    // 48
                    const value48Cell = row.insertCell();
                    value48Cell.innerHTML = "-M-";

                    // 54
                    const value54Cell = row.insertCell();
                    value54Cell.innerHTML = "-M-";

                    // 60
                    const value60Cell = row.insertCell();
                    value60Cell.innerHTML = "-M-";

                    // 66
                    const value66Cell = row.insertCell();
                    value66Cell.innerHTML = "-M-";

                    // 72
                    const value72Cell = row.insertCell();
                    value72Cell.innerHTML = "-M-";

                    // Zero Hr
                    const zeroCell = row.insertCell();
                    zeroCell.innerHTML = "";
                }
            } else if (type === "cum") {
                if (data !== null) {
                    // DATE TIME
                    const riverMileCell = row.insertCell();
                    if (river_mile_hard_coded !== null) {
                        riverMileCell.innerHTML = "<span class='hard_coded' title='Hard Coded in JSON, No Cloud Option Yet'>" + (parseFloat(river_mile_hard_coded)).toFixed(2) + "<span>";
                    } else {
                        riverMileCell.innerHTML = '<div style="background-color: orange;"></div>';
                    }

                    // LOCATION
                    const locationCell = row.insertCell();
                    locationCell.innerHTML = location_id;

                    // 06
                    const value06Cell = row.insertCell();
                    const myClass6 = setPrecipClass(extractedValues.results[0].difference, "inc_6");
                    value06Cell.innerHTML = (extractedValues.results[0].difference).toFixed(2);
                    value06Cell.classList.add(myClass6);

                    // 12
                    const value12Cell = row.insertCell();
                    const myClass12 = setPrecipClass(extractedValues.results[1].difference, "inc_12");
                    value12Cell.innerHTML = (extractedValues.results[1].difference).toFixed(2);
                    value12Cell.classList.add(myClass12);


                    // 24
                    const value24Cell = row.insertCell();
                    const myClass24 = setPrecipClass(extractedValues.results[3].difference, "inc_24");
                    value24Cell.innerHTML = (extractedValues.results[3].difference).toFixed(2);
                    value24Cell.classList.add(myClass24);


                    // 48
                    const value48Cell = row.insertCell();
                    const myClass48 = setPrecipClass(extractedValues.results[7].difference, "inc_48");
                    value48Cell.innerHTML = (extractedValues.results[7].difference).toFixed(2);
                    value48Cell.classList.add(myClass48);


                    // 72
                    const value72Cell = row.insertCell();
                    const myClass72 = setPrecipClass(extractedValues.results[11].difference, "inc_72");
                    value72Cell.innerHTML = (extractedValues.results[11].difference).toFixed(2);
                    value72Cell.classList.add(myClass72);

                    // Zero Hr
                    const zeroCell = row.insertCell();
                    // Format the lastDateTime
                    const formattedDateTime = extractedValues.lastDateTime.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false // Ensure 24-hour format
                    });

                    // Use a regular expression to replace the comma and space with a space
                    const formattedDateTimeWithSpace = formattedDateTime.replace(', ', ' ');

                    // Replace slashes with dashes
                    const finalFormattedDateTime = formattedDateTimeWithSpace.replace(/\//g, '-');

                    zeroCell.innerHTML = finalFormattedDateTime;
                } else {
                    // DATE TIME
                    const riverMileCell = row.insertCell();
                    if (river_mile_hard_coded !== null) {
                        riverMileCell.innerHTML = "<span class='hard_coded' title='Hard Coded in JSON, No Cloud Option Yet'>" + (parseFloat(river_mile_hard_coded)).toFixed(2) + "<span>";
                    } else {
                        riverMileCell.innerHTML = '<div style="background-color: orange;"></div>';
                    }

                    // LOCATION
                    const locationCell = row.insertCell();
                    locationCell.innerHTML = location_id;

                    // 06
                    const value06Cell = row.insertCell();
                    value06Cell.innerHTML = "-M-";

                    // 12
                    const value12Cell = row.insertCell();
                    value12Cell.innerHTML = "-M-";


                    // 24
                    const value24Cell = row.insertCell();
                    value24Cell.innerHTML = "-M-";


                    // 48
                    const value48Cell = row.insertCell();
                    value48Cell.innerHTML = "-M-";


                    // 72
                    const value72Cell = row.insertCell();
                    value72Cell.innerHTML = "-M-";

                    // Zero Hr
                    const zeroCell = row.insertCell();
                    zeroCell.innerHTML = "";
                }
            }
        })
        .catch(error => {
            // Catch and log any errors that occur during fetching or processing
            console.error("Error fetching or processing data:", error);
        });
}

// Function to get current data time
function subtractHoursFromDate(date, hoursToSubtract) {
    return new Date(date.getTime() - (hoursToSubtract * 60 * 60 * 1000));
}

// Function to set the class 
function setPrecipClass(value, variableName) {
    if (value < 0) {
        // console.log(variableName + " less than 0");
        return "precip_less_0";
    } else if (value === 0.00) {
        // console.log(variableName + " equal to 0");
        return "precip_equal_0";
    } else if (value > 0.00 && value <= 0.25) {
        // console.log(variableName + " greater than 0 and less than or equal to 0.25");
        return "precip_greater_0";
    } else if (value > 0.25 && value <= 0.50) {
        // console.log(variableName + " greater than 0.25 and less than or equal to 0.50");
        return "precip_greater_25";
    } else if (value > 0.50 && value <= 1.00) {
        // console.log(variableName + " greater than 0.50 and less than or equal to 1.00");
        return "precip_greater_50";
    } else if (value > 1.00 && value <= 2.00) {
        // console.log(variableName + " greater than 1.00 and less than or equal to 2.00");
        return "precip_greater_100";
    } else if (value > 2.00) {
        // console.log(variableName + " greater than 2.00");
        return "precip_greater_200";
    } else if (value === null) {
        // console.log(variableName + " missing");
        return "precip_missing";
    } else {
        // console.log(variableName + " equal to else");
        return "blank";
    }
}

// Function to extract values to precip
function calculateHourlyDifferences(data) {
    const values = data.values;

    // Find last non-null value
    let lastNonNullIndex = values.length - 1;
    while (lastNonNullIndex >= 0 && values[lastNonNullIndex][1] === null) {
        lastNonNullIndex--;
    }
    const lastNonNullEntry = values[lastNonNullIndex];
    const lastDateTime = new Date(lastNonNullEntry[0]);
    const lastValue = lastNonNullEntry[1];

    const hoursBefore = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72];

    const getValueAtTime = (targetTime) => {
        for (let i = values.length - 1; i >= 0; i--) {
            const entryDateTime = new Date(values[i][0]);
            if (entryDateTime.getTime() === targetTime.getTime()) {
                return values[i][1];
            }
        }
        return null; // Return null if no matching time is found
    };

    const results = hoursBefore.map(hours => {
        const targetTime = new Date(lastDateTime.getTime() - hours * 60 * 60 * 1000);
        const value = getValueAtTime(targetTime);
        return {
            hoursBefore: hours,
            difference: value !== null ? lastValue - value : null
        };
    });

    return {
        lastDateTime,
        lastValue,
        results
    };
}