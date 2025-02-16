/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { jsPDF } from "jspdf";
import path from "path";

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

export async function POST(req: NextRequest) {
  try {
    const { routeNumber } = await req.json();
    
    if (!routeNumber) {
      return NextResponse.json({ error: "Route number is required" }, { status: 400 });
    }

    const gtfsData = await loadGTFSData(GTFS_ZIP_PATH);
    const stops = getStopsForRoute(routeNumber, gtfsData);

    // Generate PDF using jsPDF
    const doc = new jsPDF();
    const fontSize = 16;
    const lineHeight = fontSize / 72 * 25.4; // Convert to mm
    let yPosition = 20;

    // Add title
    doc.setFontSize(fontSize);
    doc.text(`Route ${routeNumber}`, doc.internal.pageSize.width / 2, yPosition, { align: 'center' });
    yPosition += lineHeight * 2;

    // Add stops
    doc.setFontSize(12);
    stops.forEach((stop) => {
      if (stop) {
        // Check if we need a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`• ${stop.stop_name}`, 20, yPosition);
        yPosition += lineHeight;
      }
    });

    // Get the PDF as array buffer
    const pdfOutput = doc.output('arraybuffer');

    return new NextResponse(pdfOutput, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=route_${routeNumber}.pdf`,
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
