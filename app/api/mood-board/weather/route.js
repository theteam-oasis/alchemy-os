import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) return NextResponse.json({ success: false, error: 'Missing lat/lng' });

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
      { next: { revalidate: 600 } } // cache 10 min
    );
    const data = await res.json();

    if (!data.current) return NextResponse.json({ success: false, error: 'No weather data' });

    const codeMap = {
      0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
      45: "fog", 48: "fog", 51: "light drizzle", 53: "drizzle", 55: "heavy drizzle",
      61: "light rain", 63: "rain", 65: "heavy rain", 71: "light snow", 73: "snow",
      80: "light showers", 81: "showers", 82: "heavy showers", 95: "thunderstorm",
    };

    return NextResponse.json({
      success: true,
      weather: {
        temp: Math.round(data.current.temperature_2m),
        unit: data.current_units?.temperature_2m || "°C",
        humidity: data.current.relative_humidity_2m,
        wind: Math.round(data.current.wind_speed_10m),
        condition: codeMap[data.current.weather_code] || "unknown",
        code: data.current.weather_code,
      },
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
