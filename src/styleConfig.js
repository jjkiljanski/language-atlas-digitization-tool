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
    }
  }
};