/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { jsPDF } from "jspdf";
import path from "path";
// import { setupFonts } from '@/lib/fonts';


const GTFS_ZIP_PATH = path.join(process.cwd(), "public/bmtc.zip");


interface GTFSData {
  routes: Route[];
  trips: Trip[];
  stopTimes: StopTime[];
  stops: Stop[];
}

interface Route {
  route_id: string;
  route_short_name: string;
}

interface Trip {
  route_id: string;
  trip_id: string;
  direction_id: string;
}

interface StopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence: string;
}

interface Stop {
  stop_id: string;
  stop_name: string;
}

const loadGTFSData = async (zipPath: string): Promise<GTFSData> => {
  const zip = new AdmZip(zipPath);
  const files = zip.getEntries();

  const readCSV = (filename: string) => {
    return new Promise<any[]>((resolve, reject) => {
      const file = files.find((f) => f.entryName === filename);
      if (!file) return reject(new Error(`${filename} not found`));
      
      const data: any[] = [];
      const lines = zip.readAsText(file).split("\n");
      const headers = lines[0].split(",");
      
      lines.slice(1).forEach(line => {
        if (!line.trim()) return;
        const values = line.split(",");
        data.push(Object.fromEntries(headers.map((h, i) => [h, values[i]])));
      });
      
      resolve(data);
    });
  };

  return {
    routes: await readCSV("routes.txt"),
    trips: await readCSV("trips.txt"),
    stopTimes: await readCSV("stop_times.txt"),
    stops: await readCSV("stops.txt"),
  };
};

const getStopsForRoute = (routeShortName: string, data: GTFSData) => {
  const { routes, trips, stopTimes, stops } = data;
  const routeMatches = routes.filter((r) => r.route_short_name === routeShortName);
  
  if (routeMatches.length === 0) {
     throw new Error(`No similar routes found for '${routeShortName}'`);
  }
  
  const routeId = routeMatches[0].route_id;
  const routeTrips = trips.filter((t) => t.route_id === routeId);
  const selectedTrip = routeTrips.find((t) => t.direction_id === "0") || routeTrips[0];
  
  const tripId = selectedTrip.trip_id;
  const tripStopTimes = stopTimes
    .filter((st) => st.trip_id === tripId)
    .sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  
  return tripStopTimes.map((st) => stops.find((s) => s.stop_id === st.stop_id));
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const routeNumber = searchParams.get('route');
    
    if (!routeNumber) {
      return NextResponse.json({ error: "Route number is required" }, { status: 400 });
    }

    const gtfsData = await loadGTFSData(GTFS_ZIP_PATH);
    const stops = getStopsForRoute(routeNumber, gtfsData);

    const doc = new jsPDF({
      unit: 'mm',
      format: [29, 62],
      putOnlyUsedFonts: true
    });

    // Bus icon as base64 PNG data URL
    const busIconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAAGXRFWHRTb2Z0d2FyZQB3d3cuaW5rc2NhcGUub3Jnm+48GgAAATlJREFUOI2tlD9KA1EQxn9fSKOgiKbRKlgJYpcuEgMGPICdloJ/TmFyAk+QE+wJ7CSguUQawUJBQeysxsJ5y0uy2azufjAMb/ab780s80ZmRpWozwYkrQCHwMaS3E9gZGbfU1EzSw1oAS+AFbRnoDWlEYltAq9/EAv2BmxlCV464SK+Mc+inKsQq0Xd77h/WvLvYjy63w6B2gLiv1EDkLQHtEvotF0jrfAA6JUQ7LlG9S3XAcwskTQAboF9SasF83fdD8wsSQVnkJSpMKvlCXAHfOTkvTtnMvclGtI+v0Pa8fMNi1/HtXM6fu5nDXbAsaQ14Cinwq5z5icjqvAsp6Jldh50FPahJAEP3sYXcJ9TIcAJsA6MgK4FoZnHPvQbxwUWw9i5w8z15aQGcAo0Cwg2nduI42nLVeEHcL4f5RmENyEAAAAASUVORK5CYII='
    // Add the base64 image to PDF
    doc.addImage(busIconBase64, 'PNG', 2, 3, 2.5, 2.5); // x, y, width, height in mm

    // Title (moved slightly to the right to accommodate icon)
    doc.setFontSize(5);
    doc.text(routeNumber, 6, 5, { align: 'left' });

    // Stops list
    doc.setFontSize(4);
    let yPosition = 10;
    const lineHeight = 3;
    const maxWidth = 25; // Maximum width for text in mm

    stops.forEach((stop) => {
      if (stop) {
        if (yPosition > 58) {
          doc.addPage([29, 62]);
          yPosition = 10;
        }

        // Split long stop names into multiple lines
        const stopText = `• ${stop.stop_name}`;
        const lines = doc.splitTextToSize(stopText, maxWidth);
        
        doc.text(lines, 2, yPosition);
        yPosition += lineHeight * lines.length;
      }
    });

    // Get the PDF as array buffer
    const pdfOutput = doc.output('arraybuffer');

    return new NextResponse(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
