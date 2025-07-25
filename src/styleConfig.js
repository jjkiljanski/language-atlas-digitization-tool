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
      // Define parameters for the dots along the line
      offset: 6, // pixels offset to one side (adjust as needed)
      repeat: 10, // distance between dots in pixels
      radius: 2, // radius of each dot in pixels
      fillColor: "#000",
      fillOpacity: 1,
      stroke: false,
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
