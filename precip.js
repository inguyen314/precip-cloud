document.addEventListener('DOMContentLoaded', async function () {
    const currentDateTime = new Date();
    console.log("currentDateTime: ", currentDateTime);

    let setLocationCategory = null;
    let setLocationGroupOwner = null;
    let setTimeseriesGroup1 = null;
    let setLookBackHours = null;
    let reportDiv = null;

    let reportNumber = 1;

    if (reportNumber === 1) {
        console.log("***************************************************************");
        console.log("********************* Setup to Run Precip *********************");
        console.log("***************************************************************");
        // Set the category and base URL for API calls
        reportDiv = "precip";
        setLocationCategory = "Basins";
        setLocationGroupOwner = "Precip";
        setTimeseriesGroup1 = "Precip";
        setLookBackHours = subtractDaysFromDate(new Date(), 4);
    }

    // Display the loading indicator for water quality alarm
    const loadingIndicator = document.getElementById(`loading_${reportDiv}`);
    loadingIndicator.style.display = 'block'; // Show the loading indicator

    console.log("setLocationCategory: ", setLocationCategory);
    console.log("setLocationGroupOwner: ", setLocationGroupOwner);
    console.log("setTimeseriesGroup1: ", setTimeseriesGroup1);
    console.log("setLookBackHours: ", setLookBackHours);

    let setBaseUrl = null;
    if (cda === "internal") {
        // setBaseUrl = `https://coe-${office.toLowerCase()}uwa04${office.toLowerCase()}.${office.toLowerCase()}.usace.army.mil:8243/${office.toLowerCase()}-data/`;
        setBaseUrl = `https://wm.${office.toLowerCase()}.ds.usace.army.mil:8243/${office.toLowerCase()}-data/`;
        // console.log("setBaseUrl: ", setBaseUrl);
    } else if (cda === "public") {
        setBaseUrl = `https://cwms-data.usace.army.mil/cwms-data/`;
        // console.log("setBaseUrl: ", setBaseUrl);
    }

    // Define the URL to fetch location groups based on category
    const categoryApiUrl = setBaseUrl + `location/group?office=${office}&include-assigned=false&location-category-like=${setLocationCategory}`;
    // console.log("categoryApiUrl: ", categoryApiUrl);

    // Initialize maps to store metadata and time-series ID (TSID) data for various parameters
    const metadataMap = new Map();
    const floodMap = new Map();
    const lwrpMap = new Map();
    const ownerMap = new Map();
    const tsidDatmanMap = new Map();

    // Initialize arrays for storing promises
    const metadataPromises = [];
    const floodPromises = [];
    const lwrpPromises = [];
    const ownerPromises = [];
    const datmanTsidPromises = [];

    // Fetch location group data from the API
    fetch(categoryApiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                console.warn('No data available from the initial fetch.');
                return;
            }

            // Filter and map the returned data to basins belonging to the target category
            const targetCategory = { "office-id": office, "id": setLocationCategory };
            const filteredArray = filterByLocationCategory(data, targetCategory);
            let basins = filteredArray.map(item => item.id);
            console.log("basins: ", basins);

            // Remove Basins
            basins = basins.filter(basinId => basin.includes(basinId));
            console.log("basins: ", basins);

            if (basins.length === 0) {
                console.warn('No basins found for the given category.');
                return;
            }

            // Initialize an array to store promises for fetching basin data
            const apiPromises = [];
            const combinedData = [];

            // Loop through each basin and fetch data for its assigned locations
            basins.forEach(basin => {
                const basinApiUrl = setBaseUrl + `location/group/${basin}?office=${office}&category-id=${setLocationCategory}`;
                // console.log("basinApiUrl: ", basinApiUrl);

                apiPromises.push(
                    fetch(basinApiUrl)
                        .then(response => {
                            if (!response.ok) {
                                throw new Error(`Network response was not ok for basin ${basin}: ${response.statusText}`);
                            }
                            return response.json();
                        })
                        .then(getBasin => {
                            // console.log('getBasin:', getBasin);

                            if (!getBasin) {
                                // console.log(`No data for basin: ${basin}`);
                                return;
                            }

                            // Filter and sort assigned locations based on 'attribute' field
                            getBasin[`assigned-locations`] = getBasin[`assigned-locations`].filter(location => location.attribute <= 900);
                            getBasin[`assigned-locations`].sort((a, b) => a.attribute - b.attribute);
                            combinedData.push(getBasin);

                            // If assigned locations exist, fetch metadata and time-series data
                            if (getBasin['assigned-locations']) {
                                getBasin['assigned-locations'].forEach(loc => {
                                    // console.log(loc['location-id']);

                                    // // Fetch metadata for each location
                                    // const locApiUrl = setBaseUrl + `locations/${loc['location-id']}?office=${office}`;
                                    // // console.log("locApiUrl: ", locApiUrl);
                                    // metadataPromises.push(
                                    //     fetch(locApiUrl)
                                    //         .then(response => {
                                    //             if (response.status === 404) {
                                    //                 console.warn(`Location metadata not found for location: ${loc['location-id']}`);
                                    //                 return null; // Skip if not found
                                    //             }
                                    //             if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                                    //             return response.json();
                                    //         })
                                    //         .then(locData => {
                                    //             if (locData) {
                                    //                 metadataMap.set(loc['location-id'], locData);
                                    //             }
                                    //         })
                                    //         .catch(error => {
                                    //             console.error(`Problem with the fetch operation for location ${loc['location-id']}:`, error);
                                    //         })
                                    // );



                                    // // Fetch flood location level for each location
                                    // const levelIdFlood = loc['location-id'] + ".Stage.Inst.0.Flood";
                                    // // console.log("levelIdFlood: ", levelIdFlood);

                                    // const levelIdEffectiveDate = "2024-01-01T08:00:00";
                                    // // console.log("levelIdEffectiveDate: ", levelIdEffectiveDate);

                                    // const floodApiUrl = setBaseUrl + `levels/${levelIdFlood}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                                    // // console.log("floodApiUrl: ", floodApiUrl);
                                    // floodPromises.push(
                                    //     fetch(floodApiUrl)
                                    //         .then(response => {
                                    //             if (response.status === 404) {
                                    //                 console.warn(`Location metadata not found for location: ${loc['location-id']}`);
                                    //                 return null; // Skip if not found
                                    //             }
                                    //             if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                                    //             return response.json();
                                    //         })
                                    //         .then(floodData => {
                                    //             if (floodData) {
                                    //                 floodMap.set(loc['location-id'], floodData);
                                    //             }
                                    //         })
                                    //         .catch(error => {
                                    //             console.error(`Problem with the fetch operation for location ${loc['location-id']}:`, error);
                                    //         })
                                    // );



                                    // // Fetch lwrp location level for each location
                                    // const levelIdLwrp = loc['location-id'] + ".Stage.Inst.0.LWRP";
                                    // // console.log("levelIdFlood: ", levelIdFlood);

                                    // const lwrpApiUrl = setBaseUrl + `levels/${levelIdLwrp}?office=${office}&effective-date=${levelIdEffectiveDate}&unit=ft`;
                                    // // console.log("lwrpApiUrl: ", lwrpApiUrl);
                                    // lwrpPromises.push(
                                    //     fetch(lwrpApiUrl)
                                    //         .then(response => {
                                    //             if (response.status === 404) {
                                    //                 console.warn(`Location metadata not found for location: ${loc['location-id']}`);
                                    //                 return null; // Skip if not found
                                    //             }
                                    //             if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                                    //             return response.json();
                                    //         })
                                    //         .then(lwrpData => {
                                    //             if (lwrpData) {
                                    //                 lwrpMap.set(loc['location-id'], lwrpData);
                                    //             }
                                    //         })
                                    //         .catch(error => {
                                    //             console.error(`Problem with the fetch operation for location ${loc['location-id']}:`, error);
                                    //         })
                                    // );



                                    // Fetch owner for each location
                                    let ownerApiUrl = setBaseUrl + `location/group/${setLocationGroupOwner}?office=${office}&category-id=${office}`;
                                    // console.log("ownerApiUrl: ", ownerApiUrl);
                                    if (ownerApiUrl) {
                                        ownerPromises.push(
                                            fetch(ownerApiUrl)
                                                .then(response => {
                                                    if (response.status === 404) {
                                                        console.warn(`Datman TSID data not found for location: ${loc['location-id']}`);
                                                        return null;
                                                    }
                                                    if (!response.ok) {
                                                        throw new Error(`Network response was not ok: ${response.statusText}`);
                                                    }
                                                    return response.json();
                                                })
                                                .then(ownerData => {
                                                    if (ownerData) {
                                                        // console.log("ownerData", ownerData);
                                                        ownerMap.set(loc['location-id'], ownerData);
                                                    }
                                                })
                                                .catch(error => {
                                                    console.error(`Problem with the fetch operation for stage TSID data at ${ownerApiUrl}:`, error);
                                                })
                                        );
                                    }

                                    // Fetch datman TSID data
                                    const tsidDatmanApiUrl = setBaseUrl + `timeseries/group/${setTimeseriesGroup1}?office=${office}&category-id=${loc['location-id']}`;
                                    // console.log('tsidDatmanApiUrl:', tsidDatmanApiUrl);
                                    datmanTsidPromises.push(
                                        fetch(tsidDatmanApiUrl)
                                            .then(response => {
                                                if (response.status === 404) return null; // Skip if not found
                                                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                                                return response.json();
                                            })
                                            .then(tsidDatmanData => {
                                                // // console.log('tsidDatmanData:', tsidDatmanData);
                                                if (tsidDatmanData) {
                                                    tsidDatmanMap.set(loc['location-id'], tsidDatmanData);
                                                }
                                            })
                                            .catch(error => {
                                                console.error(`Problem with the fetch operation for stage TSID data at ${tsidDatmanApiUrl}:`, error);
                                            })
                                    );
                                });
                            }
                        })
                        .catch(error => {
                            console.error(`Problem with the fetch operation for basin ${basin}:`, error);
                        })
                );
            });

            // Process all the API calls and store the fetched data
            Promise.all(apiPromises)
                // .then(() => Promise.all(metadataPromises))
                // .then(() => Promise.all(floodPromises))
                // .then(() => Promise.all(lwrpPromises))
                .then(() => Promise.all(ownerPromises))
                .then(() => Promise.all(datmanTsidPromises))
                .then(() => {
                    combinedData.forEach(basinData => {
                        if (basinData['assigned-locations']) {
                            basinData['assigned-locations'].forEach(loc => {
                                // Add metadata, TSID, and last-value data to the location object

                                // // Add metadata to json
                                // const metadataMapData = metadataMap.get(loc['location-id']);
                                // if (metadataMapData) {
                                //     loc['metadata'] = metadataMapData;
                                // }


                                // // Add flood to json
                                // const floodMapData = floodMap.get(loc['location-id']);
                                // loc['flood'] = floodMapData !== undefined ? floodMapData : null;


                                // // Add lwrp to json
                                // const lwrpMapData = lwrpMap.get(loc['location-id']);
                                // loc['lwrp'] = lwrpMapData !== undefined ? lwrpMapData : null;


                                // Add owner to json
                                const ownerMapData = ownerMap.get(loc['location-id']);
                                if (ownerMapData) {
                                    loc['owner'] = ownerMapData;
                                }

                                // Add datman to json
                                const tsidDatmanMapData = tsidDatmanMap.get(loc['location-id']);
                                if (tsidDatmanMapData) {
                                    reorderByAttribute(tsidDatmanMapData);
                                    loc['tsid-datman'] = tsidDatmanMapData;
                                } else {
                                    loc['tsid-datman'] = null;  // Append null if missing
                                }

                                // Initialize empty arrays to hold API and last-value data for various parameters
                                loc['datman-api-data'] = [];
                                loc['datman-last-value'] = [];
                            });
                        }
                    });

                    console.log('combinedData:', combinedData);

                    const timeSeriesDataPromises = [];

                    // Iterate over all arrays in combinedData
                    for (const dataArray of combinedData) {
                        for (const locData of dataArray['assigned-locations'] || []) {
                            // Handle temperature, depth, and DO time series
                            const datmanTimeSeries = locData['tsid-datman']?.['assigned-time-series'] || [];

                            // Function to create fetch promises for time series data
                            const timeSeriesDataFetchPromises = (timeSeries, type) => {
                                return timeSeries.map((series, index) => {
                                    const tsid = series['timeseries-id'];
                                    const timeSeriesDataApiUrl = setBaseUrl + `timeseries?page-size=5000&name=${tsid}&begin=${setLookBackHours.toISOString()}&end=${currentDateTime.toISOString()}&office=${office}`;
                                    // console.log('timeSeriesDataApiUrl:', timeSeriesDataApiUrl);

                                    return fetch(timeSeriesDataApiUrl, {
                                        method: 'GET',
                                        headers: {
                                            'Accept': 'application/json;version=2'
                                        }
                                    })
                                        .then(res => res.json())
                                        .then(data => {

                                            console.log("data: ", data);

                                            if (data.values) {
                                                data.values.forEach(entry => {
                                                    entry[0] = formatISODate2ReadableDate(entry[0]);
                                                });
                                            }

                                            let apiDataKey;
                                            if (type === 'datman') {
                                                apiDataKey = 'datman-api-data'; // Assuming 'do-api-data' is the key for dissolved oxygen data
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return to avoid pushing data if type is unknown
                                            }

                                            locData[apiDataKey].push(data);

                                            let lastValueKey;
                                            if (type === 'datman') {
                                                lastValueKey = 'datman-last-value';  // Assuming 'do-last-value' is the key for dissolved oxygen last value
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let maxValueKey;
                                            if (type === 'datman') {
                                                maxValueKey = 'datman-max-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let minValueKey;
                                            if (type === 'datman') {
                                                minValueKey = 'datman-min-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let cumValueKey;
                                            if (type === 'datman') {
                                                cumValueKey = 'datman-cum-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            let incValueKey;
                                            if (type === 'datman') {
                                                incValueKey = 'datman-inc-value';
                                            } else {
                                                console.error('Unknown type:', type);
                                                return; // Early return if the type is unknown
                                            }

                                            if (!locData[lastValueKey]) {
                                                locData[lastValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[maxValueKey]) {
                                                locData[maxValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[minValueKey]) {
                                                locData[minValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[cumValueKey]) {
                                                locData[cumValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            if (!locData[incValueKey]) {
                                                locData[incValueKey] = [];  // Initialize as an array if it doesn't exist
                                            }

                                            // Get and store the last non-null value for the specific tsid
                                            const lastValue = getLastNonNullValue(data, tsid);

                                            // Get and store the last max value for the specific tsid
                                            const maxValue = getMaxValue(data, tsid);
                                            // console.log("maxValue: ", maxValue);

                                            // Get and store the last min value for the specific tsid
                                            const minValue = getMinValue(data, tsid);
                                            // console.log("minValue: ", minValue);

                                            // Get and store the last min value for the specific tsid
                                            const cumValue = getCumValue(data, tsid);
                                            // console.log("cumValue: ", cumValue);

                                            // Get and store the last min value for the specific tsid
                                            const incValue = getIncValue(data, tsid);
                                            // console.log("incValue: ", incValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[lastValueKey].push(lastValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[maxValueKey].push(maxValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[minValueKey].push(minValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[cumValueKey].push(cumValue);

                                            // Push the last non-null value to the corresponding last-value array
                                            locData[incValueKey].push(incValue);
                                        })

                                        .catch(error => {
                                            console.error(`Error fetching additional data for location ${locData['location-id']} with TSID ${tsid}:`, error);
                                        });
                                });
                            };


                            // Create promises for temperature, depth, and DO time series
                            const datmanPromises = timeSeriesDataFetchPromises(datmanTimeSeries, 'datman');

                            // Additional API call for extents data
                            const timeSeriesDataExtentsApiCall = async (type) => {
                                const extentsApiUrl = setBaseUrl + `catalog/TIMESERIES?page-size=5000&office=${office}`;
                                // console.log('extentsApiUrl:', extentsApiUrl);

                                try {
                                    const res = await fetch(extentsApiUrl, {
                                        method: 'GET',
                                        headers: {
                                            'Accept': 'application/json;version=2'
                                        }
                                    });
                                    const data = await res.json();
                                    locData['extents-api-data'] = data;
                                    locData[`extents-data`] = {};

                                    // Collect TSIDs from temp, depth, and DO time series
                                    const datmanTids = datmanTimeSeries.map(series => series['timeseries-id']);
                                    const allTids = [...datmanTids]; // Combine both arrays

                                    allTids.forEach((tsid, index) => {
                                        const matchingEntry = data.entries.find(entry => entry['name'] === tsid);
                                        if (matchingEntry) {
                                            // Convert times from UTC
                                            let latestTimeUTC = matchingEntry.extents[0]?.['latest-time'];
                                            let earliestTimeUTC = matchingEntry.extents[0]?.['earliest-time'];

                                            // Convert UTC times to Date objects
                                            let latestTimeCST = new Date(latestTimeUTC);
                                            let earliestTimeCST = new Date(earliestTimeUTC);

                                            // Function to format date as "MM-DD-YYYY HH:mm"
                                            const formatDate = (date) => {
                                                return date.toLocaleString('en-US', {
                                                    timeZone: 'America/Chicago', // Set the timezone to Central Time (CST/CDT)
                                                    month: '2-digit',
                                                    day: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false // Use 24-hour format
                                                }).replace(',', ''); // Remove the comma from the formatted string
                                            };

                                            // Format the times to CST/CDT
                                            let formattedLatestTime = formatDate(latestTimeCST);
                                            let formattedEarliestTime = formatDate(earliestTimeCST);

                                            // Construct the _data object with formatted times
                                            let _data = {
                                                office: matchingEntry.office,
                                                name: matchingEntry.name,
                                                earliestTime: formattedEarliestTime, // Use formatted earliestTime
                                                earliestTimeISO: earliestTimeCST.toISOString(), // Store original ISO format as well
                                                lastUpdate: matchingEntry.extents[0]?.['last-update'],
                                                latestTime: formattedLatestTime, // Use formatted latestTime
                                                latestTimeISO: latestTimeCST.toISOString(), // Store original ISO format as well
                                                tsid: matchingEntry['timeseries-id'],
                                            };

                                            // Determine extent key based on tsid
                                            let extent_key;
                                            if (tsid.includes('Stage') || tsid.includes('Elev') || tsid.includes('Flow') || tsid.includes('Conc-DO')) {
                                                extent_key = 'datman';
                                            } else {
                                                return; // Ignore if it doesn't match the condition
                                            }

                                            // Update locData with extents-data
                                            if (!locData[`extents-data`][extent_key]) {
                                                locData[`extents-data`][extent_key] = [_data];
                                            } else {
                                                locData[`extents-data`][extent_key].push(_data);
                                            }

                                        } else {
                                            console.warn(`No matching entry found for TSID: ${tsid}`);
                                        }
                                    });
                                } catch (error) {
                                    console.error(`Error fetching additional data for location ${locData['location-id']}:`, error);
                                }
                            };

                            // Combine all promises for this location
                            timeSeriesDataPromises.push(Promise.all([...datmanPromises, timeSeriesDataExtentsApiCall()]));
                        }
                    }

                    // Wait for all additional data fetches to complete
                    return Promise.all(timeSeriesDataPromises);
                })
                .then(() => {
                    // Assuming this is inside a promise chain (like in a `.then()`)

                    console.log('All combinedData data fetched successfully:', combinedData);

                    // Step 1: Filter out locations where 'attribute' ends with '.1'
                    combinedData.forEach((dataObj, index) => {
                        // console.log(`Processing dataObj at index ${index}:`, dataObj['assigned-locations']);

                        // Filter out locations with 'attribute' ending in '.1'
                        dataObj['assigned-locations'] = dataObj['assigned-locations'].filter(location => {
                            const attribute = location['attribute'].toString();
                            if (attribute.endsWith('.1')) {
                                // Log the location being removed
                                console.log(`Removing location with attribute '${attribute}' and id '${location['location-id']}' at index ${index}`);
                                return false; // Filter out this location
                            }
                            return true; // Keep the location
                        });

                        // console.log(`Updated assigned-locations for index ${index}:`, dataObj['assigned-locations']);
                    });

                    console.log('Filtered all locations ending with .1 successfully:', combinedData);

                    // Step 2: Filter out locations where 'location-id' doesn't match owner's 'assigned-locations'
                    combinedData.forEach(dataGroup => {
                        // Iterate over each assigned-location in the dataGroup
                        let locations = dataGroup['assigned-locations'];

                        // Loop through the locations array in reverse to safely remove items
                        for (let i = locations.length - 1; i >= 0; i--) {
                            let location = locations[i];

                            // Find if the current location-id exists in owner's assigned-locations
                            let matchingOwnerLocation = location['owner']['assigned-locations'].some(ownerLoc => {
                                return ownerLoc['location-id'] === location['location-id'];
                            });

                            // If no match, remove the location
                            if (!matchingOwnerLocation) {
                                console.log(`Removing location with id ${location['location-id']} as it does not match owner`);
                                locations.splice(i, 1);
                            }
                        }
                    });

                    console.log('Filtered all locations by matching location-id with owner successfully:', combinedData);

                    // Step 3: Filter out locations where 'tsid-datman' is null
                    combinedData.forEach(dataGroup => {
                        // Iterate over each assigned-location in the dataGroup
                        let locations = dataGroup['assigned-locations'];

                        // Loop through the locations array in reverse to safely remove items
                        for (let i = locations.length - 1; i >= 0; i--) {
                            let location = locations[i];

                            // console.log("tsid-datman: ", location[`tsid-datman`]);

                            // Check if 'tsid-datman' is null or undefined
                            let isLocationNull = location[`tsid-datman`] == null;

                            // If tsid-datman is null, remove the location
                            if (isLocationNull) {
                                console.log(`Removing location with id ${location['location-id']}`);
                                locations.splice(i, 1); // Remove the location from the array
                            }
                        }
                    });

                    console.log('Filtered all locations where tsid is null successfully:', combinedData);


                    // Check if there are valid lastDatmanValues in the data
                    // if (hasLastValue(combinedData)) {
                    //     console.log("combinedData has all valid data.");
                    //     if (hasDataSpike(combinedData)) {
                    //         console.log("combinedData has all valid data, but data spike detected. Calling createTableDataSpike.");
                    //         // call createTable if data spike exists
                    //         const table = createTableDataSpike(combinedData);

                    //         // Append the table to the specified container
                    //         const container = document.getElementById(`table_container_alarm_${reportDiv}`);
                    //         container.appendChild(table);
                    //     } else {
                    //         console.log("combinedData has all valid data and no data spikes detected. Displaying image instead.");

                    //         // Create an img element
                    //         const img = document.createElement('img');
                    //         img.src = '/apps/alarms/images/passed.png'; // Set the image source
                    //         img.alt = 'Process Completed'; // Optional alt text for accessibility
                    //         img.style.width = '50px'; // Optional: set the image width
                    //         img.style.height = '50px'; // Optional: set the image height

                    //         // Get the container and append the image
                    //         const container = document.getElementById(`table_container_alarm_${reportDiv}`);
                    //         container.appendChild(img);
                    //     }
                    // } else {
                    //     console.log("combinedData does not have all valid data. Calling createTable");

                    //     // Only call createTable if no valid data exists
                    //     const table = createTable(combinedData, type, reportNumber);

                    //     // Append the table to the specified container
                    //     const container = document.getElementById(`table_container_alarm_${reportDiv}`);
                    //     container.appendChild(table);
                    // }

                    // Only call createTable if no valid data exists
                    const table = createTablePrecip(combinedData, type, reportNumber);

                    // Append the table to the specified container
                    const container = document.getElementById(`table_container_${reportDiv}`);
                    container.appendChild(table);

                    loadingIndicator.style.display = 'none';
                })
                .catch(error => {
                    console.error('There was a problem with one or more fetch operations:', error);
                    loadingIndicator.style.display = 'none';
                });

        })
        .catch(error => {
            console.error('There was a problem with the initial fetch operation:', error);
            loadingIndicator.style.display = 'none';
        });
});

function filterByLocationCategory(array, setLocationCategory) {
    return array.filter(item =>
        item['location-category'] &&
        item['location-category']['office-id'] === setLocationCategory['office-id'] &&
        item['location-category']['id'] === setLocationCategory['id']
    );
}

function subtractHoursFromDate(date, hoursToSubtract) {
    return new Date(date.getTime() - (hoursToSubtract * 60 * 60 * 1000));
}

function subtractDaysFromDate(date, daysToSubtract) {
    return new Date(date.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
}

function formatISODate2ReadableDate(timestamp) {
    const date = new Date(timestamp);
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Month
    const dd = String(date.getDate()).padStart(2, '0'); // Day
    const yyyy = date.getFullYear(); // Year
    const hh = String(date.getHours()).padStart(2, '0'); // Hours
    const min = String(date.getMinutes()).padStart(2, '0'); // Minutes
    return `${mm}-${dd}-${yyyy} ${hh}:${min}`;
}

const reorderByAttribute = (data) => {
    data['assigned-time-series'].sort((a, b) => a.attribute - b.attribute);
};

const formatTime = (date) => {
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const findValuesAtTimes = (data) => {
    const result = [];
    const currentDate = new Date();

    // Create time options for 5 AM, 6 AM, and 7 AM today in Central Standard Time
    const timesToCheck = [
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 6, 0), // 6 AM CST
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 5, 0), // 5 AM CST
        new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 7, 0)  // 7 AM CST
    ];

    const foundValues = [];

    // Iterate over the values in the provided data
    const values = data.values;

    // Check for each time in the order of preference
    timesToCheck.forEach((time) => {
        // Format the date-time to match the format in the data
        const formattedTime = formatTime(time);
        // console.log(formattedTime);

        const entry = values.find(v => v[0] === formattedTime);
        if (entry) {
            foundValues.push({ time: formattedTime, value: entry[1] }); // Store both time and value if found
        } else {
            foundValues.push({ time: formattedTime, value: null }); // Store null if not found
        }
    });

    // Push the result for this data entry
    result.push({
        name: data.name,
        values: foundValues // This will contain the array of { time, value } objects
    });

    return result;
};

function getLastNonNullValue(data, tsid) {
    // Iterate over the values array in reverse
    for (let i = data.values.length - 1; i >= 0; i--) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Return the non-null value as separate variables
            return {
                tsid: tsid,
                timestamp: data.values[i][0],
                value: data.values[i][1],
                qualityCode: data.values[i][2]
            };
        }
    }
    // If no non-null value is found, return null
    return null;
}

function getMaxValue(data, tsid) {
    let maxValue = -Infinity; // Start with the smallest possible value
    let maxEntry = null; // Store the corresponding max entry (timestamp, value, quality code)

    // Loop through the values array
    for (let i = 0; i < data.values.length; i++) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Update maxValue and maxEntry if the current value is greater
            if (data.values[i][1] > maxValue) {
                maxValue = data.values[i][1];
                maxEntry = {
                    tsid: tsid,
                    timestamp: data.values[i][0],
                    value: data.values[i][1],
                    qualityCode: data.values[i][2]
                };
            }
        }
    }

    // Return the max entry (or null if no valid values were found)
    return maxEntry;
}

function getMinValue(data, tsid) {
    let minValue = Infinity; // Start with the largest possible value
    let minEntry = null; // Store the corresponding min entry (timestamp, value, quality code)

    // Loop through the values array
    for (let i = 0; i < data.values.length; i++) {
        // Check if the value at index i is not null
        if (data.values[i][1] !== null) {
            // Update minValue and minEntry if the current value is smaller
            if (data.values[i][1] < minValue) {
                minValue = data.values[i][1];
                minEntry = {
                    tsid: tsid,
                    timestamp: data.values[i][0],
                    value: data.values[i][1],
                    qualityCode: data.values[i][2]
                };
            }
        }
    }

    // Return the min entry (or null if no valid values were found)
    return minEntry;
}

function getCumValue(data, tsid) {
    let value0 = null;  // Recent (0 hours)
    let value6 = null;  // 6 hours earlier
    let value12 = null; // 12 hours earlier
    let value18 = null; // 18 hours earlier
    let value24 = null; // 24 hours earlier
    let value30 = null; // 30 hours earlier
    let value36 = null; // 36 hours earlier
    let value42 = null; // 42 hours earlier
    let value48 = null; // 48 hours earlier
    let value54 = null; // 54 hours earlier
    let value60 = null; // 60 hours earlier
    let value66 = null; // 66 hours earlier
    let value72 = null; // 72 hours earlier

    // Iterate over the values array in reverse
    for (let i = data.values.length - 1; i >= 0; i--) {
        const [timestamp, value, qualityCode] = data.values[i];

        // Check if the value at index i is not null
        if (value !== null) {
            // Convert timestamp to Date object
            const currentTimestamp = new Date(timestamp);
            // console.log("currentTimestamp: ", currentTimestamp);

            // If value0 hasn't been set, set it to the latest non-null value
            if (!value0) {
                value0 = { tsid, timestamp, value, qualityCode };
            } else {
                // Calculate target timestamps for each interval
                const sixHoursEarlier = new Date(value0.timestamp);
                sixHoursEarlier.setHours(sixHoursEarlier.getHours() - 6);

                const twelveHoursEarlier = new Date(value0.timestamp);
                twelveHoursEarlier.setHours(twelveHoursEarlier.getHours() - 12);

                const eighteenHoursEarlier = new Date(value0.timestamp);
                eighteenHoursEarlier.setHours(eighteenHoursEarlier.getHours() - 18);

                const twentyFourHoursEarlier = new Date(value0.timestamp);
                twentyFourHoursEarlier.setHours(twentyFourHoursEarlier.getHours() - 24);

                const thirtyHoursEarlier = new Date(value0.timestamp);
                thirtyHoursEarlier.setHours(thirtyHoursEarlier.getHours() - 30);

                const thirtySixHoursEarlier = new Date(value0.timestamp);
                thirtySixHoursEarlier.setHours(thirtySixHoursEarlier.getHours() - 36);

                const fortyTwoHoursEarlier = new Date(value0.timestamp);
                fortyTwoHoursEarlier.setHours(fortyTwoHoursEarlier.getHours() - 42);

                const fortyEightHoursEarlier = new Date(value0.timestamp);
                fortyEightHoursEarlier.setHours(fortyEightHoursEarlier.getHours() - 48);

                const fiftyFourHoursEarlier = new Date(value0.timestamp);
                fiftyFourHoursEarlier.setHours(fiftyFourHoursEarlier.getHours() - 54);

                const sixtyHoursEarlier = new Date(value0.timestamp);
                sixtyHoursEarlier.setHours(sixtyHoursEarlier.getHours() - 60);

                const sixtySixHoursEarlier = new Date(value0.timestamp);
                sixtySixHoursEarlier.setHours(sixtySixHoursEarlier.getHours() - 66);

                const seventyTwoHoursEarlier = new Date(value0.timestamp);
                seventyTwoHoursEarlier.setHours(seventyTwoHoursEarlier.getHours() - 72);

                // Assign values if the timestamps match
                if (!value6 && currentTimestamp.getTime() === sixHoursEarlier.getTime()) {
                    value6 = { tsid, timestamp, value, qualityCode };
                } else if (!value12 && currentTimestamp.getTime() === twelveHoursEarlier.getTime()) {
                    value12 = { tsid, timestamp, value, qualityCode };
                } else if (!value18 && currentTimestamp.getTime() === eighteenHoursEarlier.getTime()) {
                    value18 = { tsid, timestamp, value, qualityCode };
                } else if (!value24 && currentTimestamp.getTime() === twentyFourHoursEarlier.getTime()) {
                    value24 = { tsid, timestamp, value, qualityCode };
                } else if (!value30 && currentTimestamp.getTime() === thirtyHoursEarlier.getTime()) {
                    value30 = { tsid, timestamp, value, qualityCode };
                } else if (!value36 && currentTimestamp.getTime() === thirtySixHoursEarlier.getTime()) {
                    value36 = { tsid, timestamp, value, qualityCode };
                } else if (!value42 && currentTimestamp.getTime() === fortyTwoHoursEarlier.getTime()) {
                    value42 = { tsid, timestamp, value, qualityCode };
                } else if (!value48 && currentTimestamp.getTime() === fortyEightHoursEarlier.getTime()) {
                    value48 = { tsid, timestamp, value, qualityCode };
                } else if (!value54 && currentTimestamp.getTime() === fiftyFourHoursEarlier.getTime()) {
                    value54 = { tsid, timestamp, value, qualityCode };
                } else if (!value60 && currentTimestamp.getTime() === sixtyHoursEarlier.getTime()) {
                    value60 = { tsid, timestamp, value, qualityCode };
                } else if (!value66 && currentTimestamp.getTime() === sixtySixHoursEarlier.getTime()) {
                    value66 = { tsid, timestamp, value, qualityCode };
                } else if (!value72 && currentTimestamp.getTime() === seventyTwoHoursEarlier.getTime()) {
                    value72 = { tsid, timestamp, value, qualityCode };
                }

                // Break loop if all values are found
                if (
                    value6 &&
                    value12 &&
                    value18 &&
                    value24 &&
                    value30 &&
                    value36 &&
                    value42 &&
                    value48 &&
                    value54 &&
                    value60 &&
                    value66 &&
                    value72
                ) {
                    break;
                }
            }
        }
    }

    // Calculate incremental values (valueX - valuePrevious)
    // const incrementalValues = {
    //     incremental6: value6 ? value0.value - value6.value : null,
    //     incremental12: value12 ? value6.value - value12.value : null,
    //     incremental18: value18 ? value12.value - value18.value : null,
    //     incremental24: value24 ? value18.value - value24.value : null,
    //     incremental30: value30 ? value24.value - value30.value : null,
    //     incremental36: value36 ? value30.value - value36.value : null,
    //     incremental42: value42 ? value36.value - value42.value : null,
    //     incremental48: value48 ? value42.value - value48.value : null,
    //     incremental54: value54 ? value48.value - value54.value : null,
    //     incremental60: value60 ? value54.value - value60.value : null,
    //     incremental66: value66 ? value60.value - value66.value : null,
    //     incremental72: value72 ? value66.value - value72.value : null,
    // };

    // Calculate cumulative values (value0 - valueX)
    const cumulativeValues = {
        cumulative6: value0 && value6 ? value0.value - value6.value : null,
        cumulative12: value0 && value12 ? value0.value - value12.value : null,
        cumulative24: value0 && value24 ? value0.value - value24.value : null,
        cumulative48: value0 && value48 ? value0.value - value48.value : null,
        cumulative72: value0 && value72 ? value0.value - value72.value : null,
    };

    return {
        value0,
        value6,
        value12,
        value18,
        value24,
        value30,
        value36,
        value42,
        value48,
        value54,
        value60,
        value66,
        value72,
        // ...incrementalValues, // Spread operator to include incremental values in the return object
        ...cumulativeValues // Spread operator to include cumulative values in the return object
    };
}

function getIncValue(data, tsid) {
    let value0 = null;  // Recent (0 hours)
    let value6 = null;  // 6 hours earlier
    let value12 = null; // 12 hours earlier
    let value18 = null; // 18 hours earlier
    let value24 = null; // 24 hours earlier
    let value30 = null; // 30 hours earlier
    let value36 = null; // 36 hours earlier
    let value42 = null; // 42 hours earlier
    let value48 = null; // 48 hours earlier
    let value54 = null; // 54 hours earlier
    let value60 = null; // 60 hours earlier
    let value66 = null; // 66 hours earlier
    let value72 = null; // 72 hours earlier

    // Iterate over the values array in reverse
    for (let i = data.values.length - 1; i >= 0; i--) {
        const [timestamp, value, qualityCode] = data.values[i];

        // Check if the value at index i is not null
        if (value !== null) {
            // Convert timestamp to Date object
            const currentTimestamp = new Date(timestamp);

            // If value0 hasn't been set, set it to the latest non-null value
            if (!value0) {
                value0 = { tsid, timestamp, value, qualityCode };
            } else {
                // Calculate target timestamps for each interval
                const sixHoursEarlier = new Date(value0.timestamp);
                sixHoursEarlier.setHours(sixHoursEarlier.getHours() - 6);

                const twelveHoursEarlier = new Date(value0.timestamp);
                twelveHoursEarlier.setHours(twelveHoursEarlier.getHours() - 12);

                const eighteenHoursEarlier = new Date(value0.timestamp);
                eighteenHoursEarlier.setHours(eighteenHoursEarlier.getHours() - 18);

                const twentyFourHoursEarlier = new Date(value0.timestamp);
                twentyFourHoursEarlier.setHours(twentyFourHoursEarlier.getHours() - 24);

                const thirtyHoursEarlier = new Date(value0.timestamp);
                thirtyHoursEarlier.setHours(thirtyHoursEarlier.getHours() - 30);

                const thirtySixHoursEarlier = new Date(value0.timestamp);
                thirtySixHoursEarlier.setHours(thirtySixHoursEarlier.getHours() - 36);

                const fortyTwoHoursEarlier = new Date(value0.timestamp);
                fortyTwoHoursEarlier.setHours(fortyTwoHoursEarlier.getHours() - 42);

                const fortyEightHoursEarlier = new Date(value0.timestamp);
                fortyEightHoursEarlier.setHours(fortyEightHoursEarlier.getHours() - 48);

                const fiftyFourHoursEarlier = new Date(value0.timestamp);
                fiftyFourHoursEarlier.setHours(fiftyFourHoursEarlier.getHours() - 54);

                const sixtyHoursEarlier = new Date(value0.timestamp);
                sixtyHoursEarlier.setHours(sixtyHoursEarlier.getHours() - 60);

                const sixtySixHoursEarlier = new Date(value0.timestamp);
                sixtySixHoursEarlier.setHours(sixtySixHoursEarlier.getHours() - 66);

                const seventyTwoHoursEarlier = new Date(value0.timestamp);
                seventyTwoHoursEarlier.setHours(seventyTwoHoursEarlier.getHours() - 72);

                // Assign values if the timestamps match
                if (!value6 && currentTimestamp.getTime() === sixHoursEarlier.getTime()) {
                    value6 = { tsid, timestamp, value, qualityCode };
                } else if (!value12 && currentTimestamp.getTime() === twelveHoursEarlier.getTime()) {
                    value12 = { tsid, timestamp, value, qualityCode };
                } else if (!value18 && currentTimestamp.getTime() === eighteenHoursEarlier.getTime()) {
                    value18 = { tsid, timestamp, value, qualityCode };
                } else if (!value24 && currentTimestamp.getTime() === twentyFourHoursEarlier.getTime()) {
                    value24 = { tsid, timestamp, value, qualityCode };
                } else if (!value30 && currentTimestamp.getTime() === thirtyHoursEarlier.getTime()) {
                    value30 = { tsid, timestamp, value, qualityCode };
                } else if (!value36 && currentTimestamp.getTime() === thirtySixHoursEarlier.getTime()) {
                    value36 = { tsid, timestamp, value, qualityCode };
                } else if (!value42 && currentTimestamp.getTime() === fortyTwoHoursEarlier.getTime()) {
                    value42 = { tsid, timestamp, value, qualityCode };
                } else if (!value48 && currentTimestamp.getTime() === fortyEightHoursEarlier.getTime()) {
                    value48 = { tsid, timestamp, value, qualityCode };
                } else if (!value54 && currentTimestamp.getTime() === fiftyFourHoursEarlier.getTime()) {
                    value54 = { tsid, timestamp, value, qualityCode };
                } else if (!value60 && currentTimestamp.getTime() === sixtyHoursEarlier.getTime()) {
                    value60 = { tsid, timestamp, value, qualityCode };
                } else if (!value66 && currentTimestamp.getTime() === sixtySixHoursEarlier.getTime()) {
                    value66 = { tsid, timestamp, value, qualityCode };
                } else if (!value72 && currentTimestamp.getTime() === seventyTwoHoursEarlier.getTime()) {
                    value72 = { tsid, timestamp, value, qualityCode };
                }

                // Break loop if all values are found
                if (
                    value6 &&
                    value12 &&
                    value18 &&
                    value24 &&
                    value30 &&
                    value36 &&
                    value42 &&
                    value48 &&
                    value54 &&
                    value60 &&
                    value66 &&
                    value72
                ) {
                    break;
                }
            }
        }
    }

    // Calculate incremental values (valueX - valuePrevious)
    const incrementalValues = {
        incremental6: value6 ? value0.value - value6.value : null,
        incremental12: value12 ? value6.value - value12.value : null,
        incremental18: value18 ? value12.value - value18.value : null,
        incremental24: value24 ? value18.value - value24.value : null,
        incremental30: value30 ? value24.value - value30.value : null,
        incremental36: value36 ? value30.value - value36.value : null,
        incremental42: value42 ? value36.value - value42.value : null,
        incremental48: value48 ? value42.value - value48.value : null,
        incremental54: value54 ? value48.value - value54.value : null,
        incremental60: value60 ? value54.value - value60.value : null,
        incremental66: value66 ? value60.value - value66.value : null,
        incremental72: value72 ? value66.value - value72.value : null,
    };

    // Calculate cumulative values (value0 - valueX)
    // const cumulativeValues = {
    //     cumulative6: value0 && value6 ? value0.value - value6.value : null,
    //     cumulative12: value0 && value12 ? value0.value - value12.value : null,
    //     cumulative24: value0 && value24 ? value0.value - value24.value : null,
    //     cumulative48: value0 && value48 ? value0.value - value48.value : null,
    //     cumulative72: value0 && value72 ? value0.value - value72.value : null,
    // };

    return {
        value0,
        value6,
        value12,
        value18,
        value24,
        value30,
        value36,
        value42,
        value48,
        value54,
        value60,
        value66,
        value72,
        ...incrementalValues, // Spread operator to include incremental values in the return object
        // ...cumulativeValues // Spread operator to include cumulative values in the return object
    };
}

function hasLastValue(data) {
    let allLocationsValid = true; // Flag to track if all locations are valid

    // Iterate through each key in the data object
    for (const locationIndex in data) {
        if (data.hasOwnProperty(locationIndex)) { // Ensure the key belongs to the object
            const item = data[locationIndex];
            // console.log(`Checking basin ${parseInt(locationIndex) + 1}:`, item); // Log the current item being checked

            const assignedLocations = item['assigned-locations'];
            // Check if assigned-locations is an object
            if (typeof assignedLocations !== 'object' || assignedLocations === null) {
                // console.log('No assigned-locations found in basin:', item);
                allLocationsValid = false; // Mark as invalid since no assigned locations are found
                continue; // Skip to the next basin
            }

            // Iterate through each location in assigned-locations
            for (const locationName in assignedLocations) {
                const location = assignedLocations[locationName];
                // console.log(`Checking location: ${locationName}`, location); // Log the current location being checked

                // Check if location['tsid-temp-water'] exists, if not, set tempWaterTsidArray to an empty array
                const datmanTsidArray = (location['tsid-datman'] && location['tsid-datman']['assigned-time-series']) || [];
                const datmanLastValueArray = location['datman-last-value'];
                // console.log("datmanTsidArray: ", datmanTsidArray);
                // console.log("datmanLastValueArray: ", datmanLastValueArray);

                // Check if 'datman-last-value' exists and is an array
                let hasValidValue = false;

                if (Array.isArray(datmanTsidArray) && datmanTsidArray.length > 0) {
                    // console.log('datmanTsidArray has data.');

                    // Loop through the datmanLastValueArray and check for null or invalid entries
                    for (let i = 0; i < datmanLastValueArray.length; i++) {
                        const entry = datmanLastValueArray[i];
                        // console.log("Checking entry: ", entry);

                        // Step 1: If the entry is null, set hasValidValue to false
                        if (entry === null) {
                            // console.log(`Entry at index ${i} is null and not valid.`);
                            hasValidValue = false;
                            continue; // Skip to the next iteration, this is not valid
                        }

                        // Step 2: If the entry exists, check if the value is valid
                        if (entry.value !== null && entry.value !== 'N/A' && entry.value !== undefined) {
                            // console.log(`Valid entry found at index ${i}:`, entry);
                            hasValidValue = true; // Set to true only if we have a valid entry
                        } else {
                            // console.log(`Entry at index ${i} has an invalid value:`, entry.value);
                            hasValidValue = false; // Invalid value, so set it to false
                        }
                    }

                    // console.log("hasValidValue: ", hasValidValue);

                    // Log whether a valid entry was found
                    if (hasValidValue) {
                        // console.log("There are valid entries in the array.");
                    } else {
                        // console.log("There are invalid entries found in the array.");
                    }
                } else {
                    // console.log(`datmanTsidArray is either empty or not an array for location ${locationName}.`);
                }

                // If no valid values found in the current location, mark as invalid
                if (!hasValidValue) {
                    allLocationsValid = false; // Set flag to false if any location is invalid
                }
            }
        }
    }

    // Return true only if all locations are valid
    if (allLocationsValid) {
        console.log('All locations have valid entries.');
        return true;
    } else {
        console.log('Some locations are missing valid entries.');
        return false;
    }
}

function createTablePrecip(combinedData, type, reportNumber) {
    // Create a table element
    const table = document.createElement('table');
    table.setAttribute('id', 'gage_data'); // Set the id to "gage_data"

    // Create a table header row
    const headerRow = document.createElement('tr');
    let columns;

    if (type === "inc") {
        // Columns for incremental values
        columns = ["River Mile", "Location", "06 hr.", "12 hr.", "18 hr.", "24 hr.", "30 hr.", "36 hr.", "42 hr.", "48 hr.", "54 hr.", "60 hr.", "66 hr.", "72 hr.", "Zero hr."];
    } else if (type === "cum") {
        // Columns for cumulative values
        columns = ["River Mile", "Location", "06 hr.", "12 hr.", "24 hr.", "48 hr.", "72 hr.", "Zero hr."];
    }

    // Append header columns
    columns.forEach((columnName) => {
        const th = document.createElement('th');
        th.textContent = columnName;
        th.style.height = '50px';
        th.style.backgroundColor = 'darkblue'; // Set background color to dark blue
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    // Populate rows for each location
    combinedData.forEach((basin) => {
        basin['assigned-locations'].forEach((location) => {
            const row = document.createElement('tr');

            // Add river mile cell
            const riverMileCell = document.createElement('td');
            riverMileCell.textContent = location['attribute']; // Assuming 'attribute' is the river mile
            row.appendChild(riverMileCell);

            // Add location link cell
            const locationCell = document.createElement('td');
            const value0 = location['datman-inc-value'][0]?.value0; // Get value0 object
            const tsid = value0 ? value0.tsid : ''; // Extract tsid for the link
            const link = `https://wm.mvs.ds.usace.army.mil/district_templates/chart/index.html?office=MVS&cwms_ts_id=${tsid}&cda=internal`;

            const linkElement = document.createElement('a');
            linkElement.href = link;
            linkElement.target = '_blank'; // Open link in a new tab
            linkElement.textContent = location['location-id']; // Set link text to location id
            locationCell.appendChild(linkElement);
            row.appendChild(locationCell);

            // Use the appropriate dataset based on `type`
            let dataValues;
            if (type === "inc") {
                dataValues = location['datman-inc-value'][0]; // Get the first inc value object
                // Loop over specified incremental hours for "inc" type
                ["incremental6", "incremental12", "incremental18", "incremental24", "incremental30", "incremental36", "incremental42", "incremental48", "incremental54", "incremental60", "incremental66", "incremental72"].forEach((timeKey) => {
                    const cell = document.createElement('td');
                    const value = dataValues[timeKey] !== undefined && dataValues[timeKey] !== null 
                        ? Number(dataValues[timeKey].value).toFixed(2) 
                        : 'N/A';
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                // Extract and append the timestamp from value0
                const zeroHourCell = document.createElement('td');
                zeroHourCell.textContent = dataValues.value0 ? dataValues.value0.timestamp : 'N/A';
                row.appendChild(zeroHourCell);

            } else if (type === "cum") {
                dataValues = location['datman-cum-value'][0]; // Get the first cum value object
                // Loop over specified cumulative hours for "cum" type
                ["cumulative6", "cumulative12", "cumulative24", "cumulative48", "cumulative72"].forEach((timeKey) => {
                    const cell = document.createElement('td');
                    const value = dataValues[timeKey] !== undefined && dataValues[timeKey] !== null 
                        ? Number(dataValues[timeKey]).toFixed(2) 
                        : 'N/A';
                    cell.textContent = value;
                    row.appendChild(cell);
                });

                // Extract and append the timestamp from value0
                const zeroHourCell = document.createElement('td');
                zeroHourCell.textContent = dataValues.value0 ? dataValues.value0.timestamp : 'N/A';
                row.appendChild(zeroHourCell);
            }

            // Append row to table
            table.appendChild(row);
        });
    });

    return table; // Return the populated table element
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