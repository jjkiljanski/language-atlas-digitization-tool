import csv
import json

# Input and output filenames
input_csv = 'data.csv'
output_geojson = 'points.geojson'

features = []

# Open CSV with ";" as delimiter
with open(input_csv, newline='', encoding='utf-8') as csvfile:
    reader = csv.DictReader(csvfile, delimiter=';')
    for row in reader:
        coords_str = row['Coordinates']
        try:
            # Split latitude,longitude from Google Maps format
            lat_str, lon_str = coords_str.split(',')
            lat = float(lat_str.strip())
            lon = float(lon_str.strip())

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]  # GeoJSON needs [lon, lat]
                },
                "properties": {
                    key: val for key, val in row.items() if key != "Coordinates"
                }
            }
            features.append(feature)
        except Exception as e:
            print(f"Skipping row due to error: {e}")

# Wrap all features in a FeatureCollection
geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Save to a .geojson file
with open(output_geojson, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, indent=2)

print(f"GeoJSON saved to {output_geojson}")
