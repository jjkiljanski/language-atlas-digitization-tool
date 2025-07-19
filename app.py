
import dash
from dash import dcc, html, Input, Output
import pandas as pd
import plotly.express as px
import json

# Load CSV data
df = pd.read_csv("data/data.csv", sep=";")

# Load metadata from JSON
with open("data/metadata.json", "r", encoding="utf-8") as f:
    metadata_dict = json.load(f)

# Split coordinates into latitude and longitude
df[['lat', 'lon']] = df['Coordinates'].str.split(',', expand=True).astype(float)

# Create a column that combines the preferred display name
df['Display City Name'] = df['City Name Today'].fillna('').replace('', pd.NA)
df['Display City Name'] = df['Display City Name'].fillna(df['Original City Name'])

# Extract all non-coordinate columns
map_columns = [map_dict["map_id"] for map_dict in metadata_dict if map_dict["map_id"] in df.columns and map_dict["map_id"] not in ['Coordinates', 'lat', 'lon']]

# Initialize the Dash app
app = dash.Dash(__name__)
app.title = "Map Viewer"

app.layout = html.Div([
    html.Link(
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap",
        rel="stylesheet"
    ),

    # Top bar with title
    html.Div([
        html.H1("Atlas Językowy Kaszubszczyzny", style={
            "margin": "0",
            "padding": "15px 30px",
            "fontWeight": "600",
            "fontSize": "24px",
            "fontFamily": "'Inter', sans-serif",
            "textAlign": "center",
            "backgroundColor": "#ffffff",
            "boxShadow": "0 2px 5px rgba(0,0,0,0.1)",
            "userSelect": "none",
        })
    ], style={
        "position": "fixed",
        "top": "0",
        "left": "0",
        "right": "0",
        "height": "60px",
        "zIndex": "999",
    }),

    # Main content: sidebar + map area
    html.Div([
        # Sidebar (left column)
        html.Div([
            html.Label("Wybierz mapę:", style={
                "fontWeight": "500",
                "marginTop": "20px",
                "marginBottom": "10px"
            }),
            dcc.Dropdown(
                id='map-column',
                options=[{'label': col, 'value': col} for col in map_columns],
                value=None,
                clearable=False,
                style={'width': '100%'}
            ),
            html.Label("Opis Mapy:", style={
                "fontWeight": "500",
                "marginTop": "20px",
                "marginBottom": "10px"
            }),
            html.Div(id='map-description', style={
                "height": "calc(100vh - 150px)",  # full height minus top bar and some padding
                "overflowY": "auto",
                "padding": "10px",
                "border": "1px solid #ddd",
                "borderRadius": "5px",
                "backgroundColor": "#f9f9f9",
                "whiteSpace": "pre-wrap",
                "fontSize": "14px",
                "boxSizing": "border-box"
            })
        ], style={
            "width": "300px",
            "padding": "20px 15px",
            "backgroundColor": "#f4f4f4",
            "fontFamily": "'Inter', sans-serif",
            "boxShadow": "2px 0 5px rgba(0,0,0,0.05)",
            "height": "calc(100vh - 60px)",  # full viewport height minus top bar
            "position": "fixed",
            "top": "60px",
            "left": "0",
            "boxSizing": "border-box",
            "overflowY": "auto"
        }),

        # Map (right content area)
        html.Div([
            dcc.Graph(
                id='map-graph',
                figure={
                    "data": [],
                    "layout": {
                        "mapbox": {
                            "style": "carto-positron",
                            "center": {"lat": 53.94, "lon": 18.0},
                            "zoom": 7,
                        },
                        "margin": {"r": 0, "t": 0, "l": 0, "b": 0},
                    }
                },
                style={"height": "100%", "width": "100%"}
            )
        ], style={
            "marginLeft": "300px",
            "marginTop": "60px",  # below top bar
            "height": "calc(100vh - 60px)",
            "width": "calc(100vw - 300px)",
            "boxSizing": "border-box"
        })
    ], style={"display": "flex", "flexDirection": "row", "height": "100vh"})
])


@app.callback(
    Output('map-graph', 'figure'),
    Output('map-description', 'children'),
    Input('map-column', 'value')
)
def update_map_and_description(selected_column):
    # Prepare fallback display name
    df['Nazwa Miejscowości'] = df['City Name Today'].fillna('').replace('', pd.NA)
    df['Nazwa Miejscowości'] = df['Nazwa Miejscowości'].fillna(df['Original City Name'])

    # Lookup description
    description = next((item["description"] for item in metadata_dict if item["map_id"] == selected_column), "Brak opisu dla tej mapy.")

    # Build map figure
    fig = px.scatter_map(
        df,
        lat='lat',
        lon='lon',
        color=selected_column,
        hover_name="Nr",
        hover_data={
            "Nazwa Miejscowości": True,
            selected_column: True,
            "lat": False,
            "lon": False
        },
        zoom=7,
        center={"lat": df['lat'].mean(), "lon": df['lon'].mean()}, # Best center: 53.94, 18.00
    )

    print(f"center_lat: {df['lat'].mean()}, center_lon: {df['lon'].mean()}")

    fig.update_layout(
        legend=dict(
            y=0.99,
            yanchor='top',
            x=0.01,
            xanchor='left',
            bgcolor='rgba(255,255,255,0.7)',  # semi-transparent background
            bordercolor='black',
            borderwidth=1,
            font=dict(size=12),
        ),
        margin={"r":0,"t":0,"l":0,"b":0},
    )

    fig.update_traces(marker=dict(size=10))

    return fig, description

if __name__ == '__main__':
    app.run(debug=True)