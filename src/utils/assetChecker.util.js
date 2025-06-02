import axios from "axios";
import fs from "fs"; // <-- for streaming
import fsPromises from "fs/promises"; // <-- for async file operations
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse";

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INSTRUMENTS_URL = "https://api.kite.trade/instruments";
const CSV_FILE_PATH = path.join(__dirname, "instruments_downloaded.csv");
const OUTPUT_JSON_PATH = path.join(__dirname, "immediate_nifty_options.json");

let immediateNiftyOptionsCache = [];

/**
 * Downloads the instruments CSV file.
 */
async function downloadInstrumentsFile() {
  console.log(`Starting download from ${INSTRUMENTS_URL}...`);
  try {
    const response = await axios({
      method: "get",
      url: INSTRUMENTS_URL,
      responseType: "stream",
    });

    if (response.status !== 200) {
      console.error(`Failed to download file. Status Code: ${response.status}`);
      return false;
    }

    const writer = fs.createWriteStream(CSV_FILE_PATH);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        console.log(
          `File downloaded successfully and saved to ${CSV_FILE_PATH}`,
        );
        resolve(true);
      });
      writer.on("error", (err) => {
        console.error("Error writing downloaded file:", err.message);
        fsPromises.unlink(CSV_FILE_PATH).catch(() => {});
        reject(false);
      });
    });
  } catch (error) {
    console.error("Error during download request:", error.message);
    return false;
  }
}

/**
 * Filters NIFTY options for the most immediate expiry date from the CSV file.
 */
async function findAndCacheImmediateNiftyOptions() {
  console.log(`Processing CSV file: ${CSV_FILE_PATH}`);
  try {
    const fileContent = await fsPromises.readFile(CSV_FILE_PATH, {
      encoding: "utf8",
    });

    const records = await new Promise((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        },
        (err, parsedRecords) => {
          if (err) return reject(err);
          resolve(parsedRecords);
        },
      );
    });

    console.log(`Parsed ${records.length} records from the CSV.`);

    const niftyOptions = records.filter((instrument) => {
      const name = instrument.name ? instrument.name.toUpperCase() : "";
      const exchange = instrument.exchange
        ? instrument.exchange.toUpperCase()
        : "";
      const instrumentType = instrument.instrument_type
        ? instrument.instrument_type.toUpperCase()
        : "";
      const tradingsymbol = instrument.tradingsymbol
        ? instrument.tradingsymbol.toUpperCase()
        : "";

      return (
        name === "NIFTY" &&
        exchange === "NFO" &&
        (instrumentType === "CE" || instrumentType === "PE") &&
        tradingsymbol.startsWith("NIFTY") &&
        !tradingsymbol.startsWith("NIFTYNXT") &&
        !tradingsymbol.startsWith("NIFTYMID") &&
        !tradingsymbol.startsWith("NIFTYFIN") &&
        !tradingsymbol.startsWith("NIFTYBANK")
      );
    });

    if (niftyOptions.length === 0) {
      console.log("No NIFTY options found.");
      immediateNiftyOptionsCache = [];
      return;
    }

    let minExpiryDate = null;
    let validOptionsWithDate = [];

    niftyOptions.forEach((opt) => {
      if (opt.expiry && opt.expiry.trim() !== "") {
        try {
          const expiryDate = new Date(opt.expiry);
          if (isNaN(expiryDate.getTime())) return;
          validOptionsWithDate.push({ ...opt, expiryDateObj: expiryDate });
          if (minExpiryDate === null || expiryDate < minExpiryDate) {
            minExpiryDate = expiryDate;
          }
        } catch (e) {
          /* ignore parse error for a single date */
        }
      }
    });

    if (minExpiryDate === null) {
      console.log("Could not determine the most immediate expiry date.");
      immediateNiftyOptionsCache = [];
      return;
    }

    const minExpiryDateString = minExpiryDate.toISOString().split("T")[0];
    immediateNiftyOptionsCache = validOptionsWithDate
      .filter(
        (opt) =>
          opt.expiryDateObj.toISOString().split("T")[0] === minExpiryDateString,
      )
      .map((opt) => {
        const { expiryDateObj, ...rest } = opt;
        rest.strike = parseFloat(rest.strike);
        return rest;
      });

    if (immediateNiftyOptionsCache.length === 0) {
      console.log(
        `No NIFTY options found for the most immediate expiry date: ${minExpiryDateString}`,
      );
    } else {
      console.log(
        `Found ${immediateNiftyOptionsCache.length} NIFTY options with expiry (${minExpiryDateString}).`,
      );
      const sample = immediateNiftyOptionsCache[0];
      console.log(
        `Sample: Symbol: ${sample.tradingsymbol}, Expiry: ${sample.expiry}, Strike: ${sample.strike}, Type: ${sample.instrument_type}`,
      );

      await fsPromises.writeFile(
        OUTPUT_JSON_PATH,
        JSON.stringify(immediateNiftyOptionsCache, null, 2),
      );
      console.log(`Immediate NIFTY options saved to ${OUTPUT_JSON_PATH}`);
    }
  } catch (error) {
    console.error("Error processing CSV file:", error.message);
    immediateNiftyOptionsCache = [];
  }
}

/**
 * Gets a specific NIFTY option from the cached immediate expiry options.
 */
export function getSpecificNiftyOption(strikePrice, direction) {
  if (immediateNiftyOptionsCache.length === 0) {
    console.warn("Cache is empty. Run processing first.");
    return null;
  }

  const targetDirection = direction.toUpperCase();
  const foundOption = immediateNiftyOptionsCache.find(
    (opt) =>
      opt.strike === strikePrice &&
      opt.instrument_type.toUpperCase() === targetDirection,
  );
  return foundOption || null;
}

/**
 * Main function to orchestrate the download and processing.
 */
async function main() {
  const downloadSuccess = await downloadInstrumentsFile();
  if (downloadSuccess) {
    await findAndCacheImmediateNiftyOptions();

    if (immediateNiftyOptionsCache.length < 0) {
      console.log("Skipping filtering due to download failure.");
    }
  }
}

// Run the main process
main().catch((error) => {
  console.error("Unhandled error in main:", error);
});
