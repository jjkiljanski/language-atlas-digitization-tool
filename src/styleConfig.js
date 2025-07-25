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


export const areaFillStyles = {
  dots: {
    patternId: "dots",
    createShape: (pattern) => {
      const circle = new L.PatternCircle({
        x: 5,
        y: 5,
        radius: 3,
        fill: true,
        fillColor: "#000",
        stroke: false
      });
      pattern.addShape(circle);
    },
    legendStyle: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='2' cy='2' r='1' fill='black' /%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '4px 4px'
    }
  },
  vertical_stripes: {
    patternId: "vertical_stripes",
    createShape: (pattern) => {
      const path = new L.PatternPath({
        d: "M0,0 L0,10",
        stroke: true,
        color: "#000",
        weight: 3
      });
      pattern.addShape(path);
    },
    legendStyle: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='3' height='6'%3E%3Cpath d='M1,0 L1,6' stroke='black' stroke-width='1' /%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '3px 6px'
    }
  },
  horizontal_stripes: {
    patternId: "horizontal_stripes",
    createShape: (pattern) => {
      const path = new L.PatternPath({
        d: "M0,0 L10,0",
        stroke: true,
        color: "#000",
        weight: 3
      });
      pattern.addShape(path);
    },
    legendStyle: {
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0,1 L6,1' stroke='black' stroke-width='1' /%3E%3C/svg%3E")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '6px 3px'
    }
  },
  yellow: {
    isSolidFill: true,
    fillColor: "#ffff00", // bright yellow
    legendStyle: {
      backgroundColor: "#ffff00"
    }
  }
};
