export const borderStyles = {
  solid_line: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    }
  },
  dashed_line: {
    color: "#000",
    weight: 2,
    dashArray: "5,5",
    legendStyle: {
      borderTop: "2px dashed #000",
      backgroundColor: "transparent"
    }
  },
  dots_line: {
    color: "#000",
    weight: 2,
    dashArray: "1,6",
    legendStyle: {
      borderTop: "2px dotted #000",
      backgroundColor: "transparent"
    }
  },
  solid_with_dots_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "50%",
        rotation: "0",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        markerOptions: {
          icon: L.divIcon({
            className: "", // Removes default Leaflet styling
            html: `<div style="width:6px;height:6px;background:#000;border-radius:50%;border:none;margin:0;padding:0;"></div>`,
            iconSize: [6, 6],
            iconAnchor: [6.5, 3]
          })
        }
      }
    }
  },
  solid_with_rectangles_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "20%",
        rotation: "0",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        markerOptions: {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:6px;height:4px;background:#000;margin:0;padding:0;"></div>`,
            iconSize: [6, 4],
            iconAnchor: [6.5, 2]  // Slightly shifted left of the line
          })
        }
      }
    }
  },
  solid_with_horizontal_lines_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "140%",
        rotation: "90",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        markerOptions: {
          icon: L.divIcon({
            className: "",
            html: `<div style="
              width: 8px; 
              height: 2px; 
              background: #000; 
              margin: 0; 
              padding: 0;
              ">
            </div>`,
            iconSize: [8, 2],
            iconAnchor: [8.5, 1]  // Shift left, centered vertically
          })
        }
      }
    }
  },
  solid_with_double_horizontal_lines_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "40%",
        rotation: "90",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        markerOptions: {
          icon: L.divIcon({
            className: "",
            html: `
              <div style="display: flex; flex-direction: column; gap: 2px; transform: translateX(-2px);">
                <div style="width: 8px; height: 2px; background: #000;"></div>
                <div style="width: 8px; height: 2px; background: #000;"></div>
              </div>
            `,
            iconSize: [8, 6],
            iconAnchor: [8, 3]  // Horizontally shifted left (9px), vertically centered (3px)
          })
        }
      }
    }
  },
  solid_with_empty_dots_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "50%",
        rotation: "0",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        markerOptions: {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:6px;height:6px;background:transparent;border:1px solid #000;border-radius:50%;margin:0;padding:0;"></div>`,
            iconSize: [6, 6],
            iconAnchor: [6.5, 3]
          })
        }
      }
    }
  },
  solid_with_triangles_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "20%",
        rotation: "30",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        angleCorrection: 0,
        markerOptions: {
          icon: L.divIcon({
            html: `
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" style="display:block">
                <polygon points="0,0 0,10 8.66,5" fill="#000" />
              </svg>
            `,
            className: "", // <-- no default Leaflet class
            iconSize: [10, 10],
            iconAnchor: [0, 8.66]
          })
        }
      }
    }
  },
  solid_with_empty_triangles_on_side: {
    color: "#000",
    weight: 2,
    dashArray: null,
    legendStyle: {
      borderTop: null,
      backgroundColor: "#000"
    },
    decorator: {
      legendStyle: {
        upwardShift: "20%",
        rotation: "30",
      },
      type: "marker",
      offset: "0%",
      repeat: "25px",
      symbolOptions: {
        rotate: true,
        angleCorrection: 0,
        markerOptions: {
          icon: L.divIcon({
            html: `
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" style="display:block">
                <polygon points="0,0 0,10 8.66,5" fill="none" stroke="#000" stroke-width="1" />
              </svg>
            `,
            className: "", // no default Leaflet class
            iconSize: [10, 10],
            iconAnchor: [0, 8.66]
          })
        }
      }
    }
  }
};