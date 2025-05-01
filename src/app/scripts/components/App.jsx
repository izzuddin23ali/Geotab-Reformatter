import React, { useState, useRef, useEffect } from "react";
import { useFormik } from "formik";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faBarsProgress,
  faSignIn,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";

import GeotabContext from "../contexts/Geotab";
import Logger from "../utils/logger";

const App = ({ geotabApi, geotabState, appName }) => {
  const logger = Logger(appName);
  const [context, setContext] = useState({ geotabApi, geotabState, logger });

  let valid_columns =
    ".Device.DeviceName;.Device.DeviceId;.Driver.UserFirstName;.Driver.UserLastName;.ExceptionRule.ExceptionRuleName;ExceptionDetailStartTime;ExceptionDuration;ExceptionDistance;ExceptionDetailExtraInfo";
  let valid_trips_columns =
    "DeviceName;DeviceId;DeviceComment;DeviceGroup;DeviceGroup|Company Group;UserFirstName;UserLastName;UserName;UserId;UserComment;DriverGroup;DriverGroup|Company Group;TripDetailRouteName;TripDetailStartDateTime;TripDetailDrivingDuraion;TripDetailStopDateTime;TripDetailDistance;TripDetailStopDuration;TripDetailLatitude;TripDetailLongitude;TripDetailLocation;Location.ZoneZoneTypes;Location.ZoneExternalReference;TripDetailPrivateTrip;TripDetailIdlingDuration;TripDetailMaximumSpeed;TripDetailSpeedRange1;TripDetailSpeedRange1Duration;TripDetailSpeedRange2;TripDetailSpeedRange2Duration;TripDetailSpeedRange3;TripDetailSpeedRange3Duration;TripDetailIsStartDriveWorkHours;TripDetailIsStopDriveWorkHours;TripDetailWorkHoursDistance;TripDetailWorkHoursTripTime;TripDetailWorkHoursStopTime;TripDetailExceptionRule1Duration;TripDetailExceptionRule1Count;TripDetailExceptionRule1Distance;TripDetailExceptionRule2Duration;TripDetailExceptionRule2Count;TripDetailExceptionRule2Distance;TripDetailExceptionRule3Duration;TripDetailExceptionRule3Count;TripDetailExceptionRule3Distance;TripDetailExceptionRule4Duration;TripDetailExceptionRule4Count;TripDetailExceptionRule4Distance;TripDetailExceptionRule5Duration;TripDetailExceptionRule5Count;TripDetailExceptionRule5Distance;TripDetailExceptionRule6Duration;TripDetailExceptionRule6Count;TripDetailExceptionRule6Distance;TripDetailExceptionRule7Duration;TripDetailExceptionRule7Count;TripDetailExceptionRule7Distance;TripDetailExceptionRule8Duration;TripDetailExceptionRule8Count;TripDetailExceptionRule8Distance;TripStartEVBatteryCharge;TripEndEVBatteryCharge;TripElectricEnergyUsed;TripElectricEnergyUsedWhileDriving;TripElectricEnergyUsedWhileIdling;TripElectricEnergyEconomy;TripDetailFuelConsumed";
  let all_groups;
  let all_role_groups;

  // Helper function to convert seconds duration back to formatted duration string ("xx:xx:xx")
  const secondsToDurationString = (in_seconds) => {
    if (typeof in_seconds == "string") {
      in_seconds = parseInt(in_seconds, 10);
    }
    const totalDuration = in_seconds;
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = Math.floor(totalDuration % 60);

    const formattedDuration = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    return formattedDuration;
  };

  // Helper function to check for the extension of the file uploaded
  function checkExcelFileExtension(fileName) {
    const allowedExtensions = [".xls", ".xlsx"];

    const fileExtension = fileName
      .slice(fileName.lastIndexOf("."))
      .toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }

  // initial page loading
  const [pageLoading, setPageLoading] = useState(true);

  // loading handler
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [exportErrorMessage, setExportErrorMessage] = useState("");
  const [parseErrorMessage, setParseErrorMessage] = useState("");

  // export handler
  const [parseBtnDisabled, setParseBtnDisabled] = useState(false);
  const [fileProcessed, setFileProcessed] = useState(false);
  const [tripFileProcessed, setTripFileProcessed] = useState(false);

  // file handler
  const fileInfoInitial = {
    valid: false,
    fileName: "No file selected.",
    numRows: null,
    numData: null,
    headerColumns: null,
    minDate: null,
    maxDate: null,
    dataContent: null,
    groupedContent: null,
  };
  const tripFileInfoInitial = {
    valid: false,
    fileName: "No file selected.",
    numRows: null,
    numData: null,
    headerColumns: null,
    minDate: null,
    maxDate: null,
    dataContent: null,
    groupedContent: null,
  };

  const [validColumns, setValidColumns] = useState(null);
  const [validTripsColumns, setValidTripsColumns] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(fileInfoInitial);
  const [tripFileInfo, setTripFileInfo] = useState(tripFileInfoInitial);
  const fileInputRef = useRef(null);
  const tripFileInputRef = useRef(null);

  useEffect(() => {
    async function getGroupData() {
      if (valid_columns && valid_columns != "") {
        const validColumnsArray = valid_columns.split(";").filter(Boolean);
        setValidColumns(validColumnsArray);
      }

      if (valid_trips_columns && valid_trips_columns != "") {
        const validTripsColumns = valid_trips_columns
          .split(";")
          .filter(Boolean);
        setValidTripsColumns(validTripsColumns);
      }

      let parseRoleGroups = [];
      if (all_role_groups && all_role_groups.length > 0) {
        parseRoleGroups = JSON.parse(all_role_groups);
      }
      if (all_groups && all_groups != "") {
        const parseGroups = JSON.parse(all_groups);
        const organizedGroups = await getOrganizedGroups(parseGroups);
        setOrderedGroups(organizedGroups);
        const selectGroups = await getSelectGroups(
          organizedGroups,
          parseRoleGroups,
          userRole
        );
        setGroupOptions(selectGroups);
        setGroupStatus(true);
      }
    }

    getGroupData();
    setPageLoading(false);
    async function authenticateGeotabWrapper() {
      getGroupData();
      setPageLoading(false);
    }
    authenticateGeotabWrapper();
  }, []);

  // dates handler
  const today = new Date();
  const lastMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthFirstDay = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1
  );

  const formik = useFormik({
    onSubmit: (values) => {
      console.log(values);
    },
  });

  function handleResetUpload() {
    setLoading(true);
    setErrorMessage("");
    setParseErrorMessage("");
    setExportErrorMessage("");
  }

  const handleExceptionResetUpload = async () => {
    handleResetUpload();
    setFileInfo(fileInfoInitial);
    fileInputRef.current.value = "";
    tripFileInputRef.current.value = "";
    setSelectedFile(null);
    setFileProcessed(false);
    setLoading(false);
  };

  const handleTripResetUpload = async () => {
    handleResetUpload();
    setTripFileInfo(tripFileInfoInitial);
    tripFileInputRef.current.value = "";
    setSelectedFile(null);
    setFileProcessed(false);
    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    setErrorMessage("");
    setFileInfo(fileInfoInitial);
    setFileProcessed(false);

    try {
      const file = event.target.files[0];
      const fileName = file.name;
      const isExcelFile = checkExcelFileExtension(fileName);
      const XLSX = require("sheetjs-style");

      if (!file || !isExcelFile) {
        setErrorMessage("No file selected. Please select a file to upload.");
        setFileInfo(fileInfoInitial);
        return;
      }

      if (file && isExcelFile) {
        setSelectedFile(file);

        const reader = new FileReader();

        reader.onloadstart = () => {
          setLoading(true);
        };

        reader.onerror = () => {
          setLoading(false);
          setErrorMessage(
            "An error occurred. Please refresh and try again or contact support if problem persists. (E06)"
          );
        };

        reader.onload = async function (e) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // Access the first sheet
          // const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets["Data"];

          if (typeof worksheet === "undefined" || worksheet === null) {
            setFileInfo(fileInfoInitial);
            setErrorMessage(
              "Invalid Excel File uploaded. Expected report format not detected."
            );
            setLoading(false);
            return null;
          }

          // Process the worksheet data
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          const columnHeaders = jsonData[9];

          const grabHeadersObject = Object.values(columnHeaders);
          const headersArray = grabHeadersObject.map((value) => value);

          const allIncluded = validColumns.every((value) =>
            headersArray.includes(value)
          );
          if (!allIncluded) {
            setFileInfo(fileInfoInitial);
            setErrorMessage(
              "Invalid Excel File uploaded. Expected report format and data not detected."
            );
            setLoading(false);
            return null;
          }

          const updatedData = jsonData.slice(10).map((row) => {
            const updatedRow = {};
            Object.entries(row).forEach(([header, value]) => {
              const propertyName = columnHeaders[header];
              if (propertyName) {
                updatedRow[propertyName] = value;
              }
            });
            return updatedRow;
          });

          const numData = updatedData.length;
          const numRows = jsonData.length;

          const updatedFileInfo = {
            ...fileInfo,
            valid: true,
            fileName: file.name,
            numRows: numRows,
            numData: numData,
            headerColumns: Object.values(columnHeaders),
          };

          const updatedFileInfoWithDates = await handleFileDateChecker(
            updatedData,
            updatedFileInfo
          );

          setFileInfo(updatedFileInfoWithDates);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        setLoading(false);
        setFileInfo(fileInfoInitial);
        setErrorMessage(
          "Invalid file uploaded. Only Excel files (.xlsx) are supported."
        );
      }
    } catch (error) {
      setErrorMessage(
        "Error with file handling. Please refresh and try again. Contact support if problem persists. (E07)"
      );
      setFileInfo(fileInfoInitial);
      setLoading(false);
    }
  };

  const handleTripFileUpload = async (event) => {
    setErrorMessage("");
    setTripFileInfo(tripFileInfoInitial);
    setTripFileProcessed(false);

    try {
      const file = event.target.files[0];
      const fileName = file.name;
      const isExcelFile = checkExcelFileExtension(fileName);
      const XLSX = require("sheetjs-style");

      if (!file || !isExcelFile) {
        setErrorMessage("No file selected. Please select a file to upload.");
        setTripFileInfo(tripFileInfoInitial);
        return;
      }

      if (file && isExcelFile) {
        setSelectedFile(file);

        const reader = new FileReader();

        reader.onloadstart = () => {
          setLoading(true);
        };

        reader.onerror = () => {
          setLoading(false);
          setErrorMessage(
            "An error occurred. Please refresh and try again or contact support if problem persists. (E06)"
          );
        };

        reader.onload = async function (e) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });

          // Access the first sheet
          // const worksheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets["Data"];

          if (typeof worksheet === "undefined" || worksheet === null) {
            setTripFileInfo(fileInfoInitial);
            setErrorMessage(
              "Invalid Excel File uploaded. Expected report format not detected."
            );
            setLoading(false);
            return null;
          }

          // Process the worksheet data
          const jsonTripData = XLSX.utils.sheet_to_json(worksheet);
          const columnHeaders = jsonTripData[9];

          const grabHeadersObject = Object.values(columnHeaders);
          const headersArray = grabHeadersObject.map((value) => value);

          const allIncluded = validTripsColumns.every((value) =>
            headersArray.includes(value)
          );
          if (!allIncluded) {
            setTripFileInfo(tripFileInfoInitial);
            setErrorMessage(
              "Invalid Excel File uploaded. Expected report format and data not detected."
            );
            setLoading(false);
            return null;
          }

          const updatedTripData = jsonTripData.slice(10).map((row) => {
            const updatedRow = {};
            Object.entries(row).forEach(([header, value]) => {
              const propertyName = columnHeaders[header];
              if (propertyName) {
                updatedRow[propertyName] = value;
              }
            });
            return updatedRow;
          });

          const numData = updatedTripData.length;
          const numRows = jsonTripData.length;

          const updatedTripFileInfo = {
            ...tripFileInfo,
            valid: true,
            fileName: file.name,
            numRows: numRows,
            numData: numData,
            headerColumns: Object.values(columnHeaders),
          };

          const updatedTripFileInfoWithDates = await handleFileDateChecker(
            updatedTripData,
            updatedTripFileInfo
          );

          setTripFileInfo(updatedTripFileInfoWithDates);
          setLoading(false);
        };
        reader.readAsArrayBuffer(file);
      } else {
        setLoading(false);
        setTripFileInfo(tripFileInfoInitial);
        setErrorMessage(
          "Invalid file uploaded. Only Excel files (.xlsx) are supported."
        );
      }
    } catch (error) {
      setErrorMessage(
        "Error with file handling. Please refresh and try again. Contact support if problem persists. (E07)"
      );
      setTripFileInfo(tripFileInfoInitial);
      setLoading(false);
    }
  };

  const handleFileDateChecker = async (inData, inFileInfo) => {
    let maxValue = Number.NEGATIVE_INFINITY;
    let minValue = Number.POSITIVE_INFINITY;

    /*
    if (!inFileInfo.headerColumns.includes("ExceptionDetailStartTime")) {
      return inFileInfo;
    }
      */

    if (
      inFileInfo.headerColumns.includes("ExceptionDetailStartTime") ||
      inFileInfo.headerColumns.includes("TripDetailStartDateTime")
    ) {
      const XLSX = require("sheetjs-style");

      inData.forEach((obj) => {
        // parse date
        let parseDate;
        let parseDistance;
        let parseDuration;

        if (obj.ExceptionDetailStartTime) {
          parseDate = obj.ExceptionDetailStartTime;
          parseDistance = obj.ExceptionDistance;
          parseDuration = obj.ExceptionDuration;
        } else {
          parseDate = obj.TripDetailStartDateTime;
          parseDistance = obj.TripDetailDistance;
          parseDuration = obj.TripDetailDrivingDuraion;
        }
        if (parseDate > maxValue) {
          maxValue = parseDate;
        }
        if (parseDate < minValue) {
          minValue = parseDate;
        }
        const newValue = XLSX.SSF.format("dd/mm/yyyy h:m:s AM/PM", parseDate);

        // parse duration

        const totalSeconds = parseDuration * 24 * 60 * 60;

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);

        const formattedDuration = `${hours
          .toString()
          .padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`;

        // parse distance

        const formattedDistance = parseDistance.toFixed(2);

        if (obj.ExceptionDetailStartTime) {
          obj.ExceptionDetailStartTime = newValue;
          obj.ExceptionDistance = formattedDistance;
          obj.ExceptionDuration = formattedDuration;
        } else {
          obj.TripDetailStartDateTime = newValue;
          obj.TripDetailDistance = formattedDistance;
          obj.TripDetailDrivingDuraion = formattedDuration;
        }
      });

      const formattedMaxValue = XLSX.SSF.format("dd MMM yyyy", maxValue);
      const formattedMinValue = XLSX.SSF.format("dd MMM yyyy", minValue);

      return {
        ...inFileInfo,
        dataContent: inData,
        minDate: formattedMinValue,
        maxDate: formattedMaxValue,
      };
    } else {
      return {
        ...inFileInfo,
        dataContent: inData,
      };
    }
  };

  let worksheetData1 = [];
  let worksheetData2 = [];
  let worksheetData3 = [];

  const handleParseUploaded = async () => {
    handleTripParseUploaded();
    handleExceptionParseUploaded();
    excel_download();
  };

  const handleTripParseUploaded = async () => {
    setTripFileProcessed(false);

    if (!tripFileInfo.valid || !tripFileInfo.dataContent) {
      console.log(tripFileInfo);
      return null;
    }

    try {
      const data = tripFileInfo.dataContent;

      console.log(data);

      let deviceGrouping = [];

      data.forEach((trip) => {
        let deviceName = trip["DeviceName"];
        let deviceIsInArray = false;
        let i;

        deviceGrouping.forEach((device) => {
          if (device.device == trip["DeviceName"]) {
            deviceIsInArray = true;
          }
        });

        if (!deviceIsInArray) {
          deviceGrouping.push({
            device: deviceName,
            drivers: [],
          });
          deviceIsInArray = false;
        }

        deviceGrouping.forEach((device) => {
          if (!device.drivers.includes(trip["UserFirstName"])) {
            device.drivers.push({
              driver: trip["UserFirstName"],
              trips: [],
              incidents: [],
              violations: [],
            });
          }

          i = device.drivers
            .map(function (e) {
              return e.driver;
            })
            .indexOf(trip["UserFirstName"]);

          device.drivers[i].trips.push({
            mileage: parseInt(trip["TripDetailDistance"]).toFixed(2),
            duration: trip["TripDetailDrivingDuraion"],
            maxSpeed: "",
            beginning: trip["TripDetailStartDateTime"],
            end: trip["TripDetailStopDateTime"],
            initialLocation: trip["TripDetailLocation"],
            finalLocation: "",
          });
        });
      });

      worksheetData1.push([
        "Grouping",
        "Driver",
        "Mileage",
        "Driving Duration",
        "Max Speed",
        "Beginning",
        "End",
        "Initial Location",
        "Final Location",
        "BSP Trip",
        "Comment",
        "Comment By",
        "Date Updated",
        "Post Submission Notes",
      ]);

      deviceGrouping.forEach((device, deviceIndex) => {
        var firstRow = true;
        //first row device - driver - etc
        device.drivers.forEach((driver, driverIndex) => {
          var driverName = "N/A";
          if (driver.driver != undefined) {
            driverName = driver.driver;
          }
          driver.trips.forEach((trip, index) => {
            if (index == 0 && firstRow) {
              worksheetData1.push([
                device.device,
                driverName,
                trip.mileage,
                trip.duration,
                trip.maxSpeed,
                trip.beginning,
                trip.end,
                trip.initialLocation,
                trip.finalLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
              firstRow = false;
            } else if (index > 0) {
              //second row "" - "" - etc
              worksheetData1.push([
                "",
                "",
                trip.mileage,
                trip.duration,
                trip.maxSpeed,
                trip.beginning,
                trip.end,
                trip.initialLocation,
                trip.finalLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
            } else if (index == 0 && !firstRow) {
              worksheetData1.push([
                "",
                driverName,
                trip.mileage,
                trip.duration,
                trip.maxSpeed,
                trip.beginning,
                trip.end,
                trip.initialLocation,
                trip.finalLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
            }
          });
        });
        firstRow = true;
      });

      setTripFileProcessed(true);

      //setFileInfo({ ...fileInfo, groupedContent: finalizedCombinedData });
      setTripFileProcessed(true);
      setParseBtnDisabled(false);
      console.log(worksheetData1);
      return;
    } catch (error) {
      console.error(error);
      setParseErrorMessage(
        "Error processing file. Please try again or contact support if problem persists. (E08)"
      );
      setParseBtnDisabled(false);
    }
  };

  const handleExceptionParseUploaded = async () => {
    setFileProcessed(false);
    setParseErrorMessage("");
    setParseBtnDisabled(true);

    if (!fileInfo.valid || !fileInfo.dataContent) {
      return null;
    }

    try {
      const data = fileInfo.dataContent;

      let deviceGrouping = [];

      data.forEach((incident) => {
        let deviceName = incident[".Device.DeviceName"];
        let deviceIsInArray = false;
        let i;

        deviceGrouping.forEach((device) => {
          if (device.device == incident[".Device.DeviceName"]) {
            deviceIsInArray = true;
          }
        });

        if (!deviceIsInArray) {
          deviceGrouping.push({
            device: deviceName,
            drivers: [],
          });
          deviceIsInArray = false;
        }

        deviceGrouping.forEach((device) => {
          if (!device.drivers.includes(incident[".Driver.UserFirstName"])) {
            device.drivers.push({
              driver: incident[".Driver.UserFirstName"],
              trips: [],
              incidents: [],
              violations: [],
            });
          }

          i = device.drivers
            .map(function (e) {
              return e.driver;
            })
            .indexOf(incident[".Driver.UserFirstName"]);

          device.drivers[i].trips.push({
            mileage: parseInt(incident["ExceptionDistance"]).toFixed(2),
            duration: secondsToDurationString(incident["ExceptionDuration"]),
            maxSpeed: maxSpeedStr,
            beginning: incident["ExceptionDetailStartTime"],
            end: "",
            initialLocation: incident["ExceptionDetailLocation"],
            finalLocation: "",
          });

          if (
            incident["ExceptionDetailDetails"] == "Light Vehicle Speeding" ||
            incident["ExceptionDetailDetails"] == "Heavy Vehicle Speeding"
          ) {
            var speedStr = incident["ExceptionDetailExtraInfo"];
            var maxSpeedStr = speedStr
              .split("(")[0]
              .replace("Max Speed: ", "")
              .slice(0, -1);
            var maxRoadSpeedStr = speedStr
              .split("(")[1]
              .replace("Max road speed: ", "")
              .slice(0, -1);
            device.drivers[i].incidents.push({
              duration: secondsToDurationString(incident["ExceptionDuration"]),
              maxSpeed: maxSpeedStr,
              maxRoadSpeed: maxRoadSpeedStr,
              mileage: parseInt(incident["ExceptionDistance"]).toFixed(2),
              beginning: incident["ExceptionDetailStartTime"],
              initialLocation: incident["ExceptionDetailLocation"],
            });
          } else if (
            incident["ExceptionDetailDetails"] ==
              "Heavy Vehicle Harsh Braking" ||
            incident["ExceptionDetailDetails"] ==
              "Heavy Vehicle Harsh Turning" ||
            incident["ExceptionDetailDetails"] ==
              "Heavy Vehicle Harsh Acceleration" ||
            incident["ExceptionDetailDetails"] ==
              "Light Vehicle Harsh Braking" ||
            incident["ExceptionDetailDetails"] ==
              "Light Vehicle Harsh Turning" ||
            incident["ExceptionDetailDetails"] ==
              "Light Vehicle Harsh Acceleration"
          ) {
            var gForceStr = incident["ExceptionDetailExtraInfo"]
              .replace("Acceleration forward or braking: ", "")
              .replace("Acceleration side to side: ", "");
            device.drivers[i].violations.push({
              violation: incident["ExceptionDetailDetails"],
              gForceValue: gForceStr,
              duration: secondsToDurationString(incident["ExceptionDuration"]),
              mileage: parseInt(incident["ExceptionDistance"]).toFixed(2),
              maxSpeed: "",
              maxRoadSpeed: "",
              beginning: incident["ExceptionDetailStartTime"],
              initialLocation: incident["ExceptionDetailLocation"],
            });
          }
        });
      });

      worksheetData2.push([
        "Grouping",
        "Driver", //.Driver.UserName
        "Duration", //ExceptionDuration
        "Max Speed",
        "Speed Limit",
        "Mileage",
        "Beginning",
        "Initial Location",
        "BSP Trip",
        "Comment",
        "Comment By",
        "Date Updated",
        "Post Submission Notes",
      ]);

      worksheetData3.push([
        "Grouping",
        "Driver",
        "Violation",
        "G-force Value",
        "Duration",
        "Mileage",
        "Max Speed",
        "Beginning",
        "Location",
        "BSP Trip",
        "Comment",
        "Comment By",
        "Date Update",
        "Post Submission Notes",
      ]);

      deviceGrouping.forEach((device, deviceIndex) => {
        var firstRow2 = true;
        var firstRow3 = true;
        //first row device - driver - etc
        device.drivers.forEach((driver, driverIndex) => {
          var driverName = "N/A";
          if (driver.driver != undefined) {
            driverName = driver.driver;
          }
          driver.incidents.forEach((incident, index) => {
            if (index == 0 && firstRow2) {
              worksheetData2.push([
                device.device,
                driverName,
                incident.duration,
                incident.maxSpeed,
                incident.maxRoadSpeed,
                incident.mileage,
                incident.beginning,
                "",
                "",
                "",
                "",
                "",
              ]);
              firstRow2 = false;
            } else if (index > 0) {
              //second row "" - "" - etc
              worksheetData2.push([
                "",
                "",
                incident.duration,
                incident.maxSpeed,
                incident.maxRoadSpeed,
                incident.mileage,
                incident.beginning,
                "",
                "",
                "",
                "",
                "",
              ]);
            } else if (index == 0 && !firstRow2) {
              worksheetData2.push([
                "",
                driverName,
                incident.duration,
                incident.maxSpeed,
                incident.maxRoadSpeed,
                incident.mileage,
                incident.beginning,
                "",
                "",
                "",
                "",
                "",
              ]);
            }
          });
          driver.violations.forEach((violation, index) => {
            if (index == 0 && firstRow3) {
              worksheetData3.push([
                device.device,
                driverName,
                violation.violation,
                violation.gForceValue,
                violation.duration,
                violation.mileage,
                violation.maxSpeed,
                violation.beginning,
                violation.initialLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
              firstRow3 = false;
            } else if (index > 0) {
              //second row "" - "" - etc
              worksheetData3.push([
                "",
                "",
                violation.violation,
                violation.gForceValue,
                violation.duration,
                violation.mileage,
                violation.maxSpeed,
                violation.beginning,
                violation.initialLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
            } else if (index == 0 && !firstRow3) {
              worksheetData3.push([
                "",
                driverName,
                violation.violation,
                violation.gForceValue,
                violation.duration,
                violation.mileage,
                violation.maxSpeed,
                violation.beginning,
                violation.initialLocation,
                "",
                "",
                "",
                "",
                "",
              ]);
            }
          });
        });
        firstRow2 = true;
        firstRow3 = true;
      });

      setFileProcessed(true);

      //setFileInfo({ ...fileInfo, groupedContent: finalizedCombinedData });
      setFileProcessed(true);
      setParseBtnDisabled(false);
      return;
    } catch (error) {
      console.error(error);
      setParseErrorMessage(
        "Error processing file. Please try again or contact support if problem persists. (E08)"
      );
      setParseBtnDisabled(false);
    }
  };

  const excel_download = async () => {
    const XLSX = require("sheetjs-style");
    var ws = XLSX.utils.aoa_to_sheet(worksheetData1);
    var ws2 = XLSX.utils.aoa_to_sheet(worksheetData2);
    var ws3 = XLSX.utils.aoa_to_sheet(worksheetData3);

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trip Details");
    XLSX.utils.book_append_sheet(wb, ws2, "Speedings");
    XLSX.utils.book_append_sheet(wb, ws3, "Eco Driving");
    XLSX.writeFile(wb, "SheetJSExportAOA.xlsx");
  };

  if (pageLoading) {
    return (
      <>
        <title>Home - GeoTab Custom Processing</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <div className="container main-content">
          <div className="row inactive-home">
            <div className="col-12 d-flex flex-column justify-content-center mb-4">
              <div className="auth-container text-center py-5">
                <h4 className="pt-5">Loading...</h4>
                <div className="loading-ring mt-3 mb-5"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!pageLoading) {
    return (
      <>
        <GeotabContext.Provider value={[context, setContext]}>
          <div className="container main-content">
            <div className="row session-container">
              <div className="col-12 pt-4 mb-0 d-flex flex-column">
                <h2 className="form-heading mb-5">
                  GeoTab Custom Processing of Exceptions Report.
                </h2>
                <div className="steps">
                  <h3>
                    <span className="badge-circle">1</span> Upload Files
                  </h3>
                  <p className="steps-label">
                    Get exceptions report from GeoTab, through Exceptions &gt;
                    Details &gt; Advanced. Upload the generated here for further
                    processing.
                  </p>
                  <div className="upload-container row">
                    <div className="file-box">
                      <h4>1. Exceptions File</h4>
                      <input
                        type="file"
                        id="fileInput"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xlsx"
                      />
                      {fileInfo.valid && (
                        <div className="row">
                          <div className="col-12 mt-0">
                            <div className="uploaded-active">
                              <p className="m-0 p-0">
                                <span className="active-header">
                                  Current File
                                  <br />
                                </span>
                                <span className="upload-content">
                                  <span className="fa-icon"></span>{" "}
                                  {fileInfo.fileName}
                                </span>
                              </p>
                              <button
                                className="reset-btn mb-2 mt-2"
                                onClick={handleExceptionResetUpload}
                              >
                                <span className="fa-icon">
                                  <FontAwesomeIcon icon={faUndo} />
                                </span>
                                Upload New File
                              </button>
                            </div>
                          </div>
                          <div className="col-12 mt-4">
                            <p className="upload-success">
                              <span className="upload-content">
                                <span className="fa-icon">
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                </span>{" "}
                                Valid exceptions report uploaded.
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="file-box">
                      <h4>2. Trip File</h4>
                      <input
                        type="file"
                        id="tripFileInput"
                        ref={tripFileInputRef}
                        onChange={handleTripFileUpload}
                        accept=".xlsx"
                      />
                      {tripFileInfo.valid && (
                        <div className="row">
                          <div className="col-12 mt-0">
                            <div className="uploaded-active">
                              <p className="m-0 p-0">
                                <span className="active-header">
                                  Current File
                                  <br />
                                </span>
                                <span className="upload-content">
                                  <span className="fa-icon"></span>{" "}
                                  {tripFileInfo.fileName}
                                </span>
                              </p>
                              <button
                                className="reset-btn mb-2 mt-2"
                                onClick={handleTripResetUpload}
                              >
                                <span className="fa-icon">
                                  <FontAwesomeIcon icon={faUndo} />
                                </span>
                                Upload New File
                              </button>
                            </div>
                          </div>
                          <div className="col-12 mt-4">
                            <p className="upload-success">
                              <span className="upload-content">
                                <span className="fa-icon">
                                  <FontAwesomeIcon icon={faCheckCircle} />
                                </span>{" "}
                                Valid trip report uploaded.
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {loading && (
                <div className="mt-4 mb-3">
                  <div className="row-content col-12 d-flex justify-content-center">
                    <p className="loading-text">Processing...</p>
                  </div>
                  <div className="row-content d-flex col-12 justify-content-center ">
                    <div className="loading-ring"></div>
                  </div>
                </div>
              )}
              {errorMessage != "" && (
                <div className="col-12 mb-0">
                  <div className="d-flex justify-content-center flex-column mt-3 mb-0">
                    <p className="processing-error">{errorMessage}</p>
                  </div>
                </div>
              )}

              {fileInfo.valid && tripFileInfo.valid ? (
                <>
                  <hr></hr>
                  <div className="col-12 mb-1 pb-4">
                    <h3 className="mt-1">
                      <span className="badge-circle">2</span> Generate report
                    </h3>
                    <p className="steps-label mb-4">
                      Begin the processing of the GeoTab file uploaded, to
                      gather relevant data from GeoTab followed by the
                      reordering and organizing data into targeted format.
                    </p>
                    <button
                      className="primary-btn mb-2"
                      onClick={handleParseUploaded}
                      disabled={parseBtnDisabled}
                    >
                      Generate New Excel Report
                    </button>
                  </div>
                  <div className="col-12 mt-1">
                    {fileProcessed && (
                      <p className="upload-success">
                        <span className="upload-content">
                          <span className="fa-icon">
                            <FontAwesomeIcon icon={faCheckCircle} />
                          </span>{" "}
                          Report generated.
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="col-12 mb-0">
                    {parseErrorMessage != "" && (
                      <div className="d-flex justify-content-center flex-column my-4">
                        <p className="processing-error">{parseErrorMessage}</p>
                      </div>
                    )}
                  </div>
                  {loading && (
                    <div className="d-flex justify-content-center flex-column my-4 mb-4 pb-5">
                      <div className="row-content col-12 d-flex justify-content-center ">
                        <p className="loading-text">Generating...</p>
                      </div>
                      <div className="row-content d-flex col-12 justify-content-center ">
                        <div className="loading-ring"></div>
                      </div>
                    </div>
                  )}
                  <div className="col-12 mb-5">
                    {exportErrorMessage != "" && (
                      <div className="d-flex justify-content-center flex-column my-4">
                        <p className="processing-error">{exportErrorMessage}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <></>
              )}
            </div>
          </div>
        </GeotabContext.Provider>
      </>
    );
  }
};

export default App;
