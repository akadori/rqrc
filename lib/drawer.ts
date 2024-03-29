import fs from "fs";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import rough from "roughjs";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Score } from "./type";
type Color = `#${string}`;

type Option = {
  epoch: number;
  ratio: number;
  colorScheme: (metric: Score) => Color;
  origin: {
    top: number;
    left: number;
  };
  fontSize: number;
  lineHeight: number;
};

type Line = {
  from: {
    x: number;
    y: number;
  };
  to: {
    x: number;
    y: number;
  };
};

type TickAndLabel = {
  top: number;
  left: number;
  label: string;
};
type CanvasConfig = {
  width: number;
  height: number;
};

type DataConfig = {
  src: Score[];
  outfilePath: string;
};

export async function main(config: CanvasConfig & DataConfig) {
  const scores = config.src;
  const canvas = createCanvas(config.width, config.height);
  const context = canvas.getContext("2d");
  // @ts-ignore
  const rc = rough.canvas(canvas);
  const fontSize = 20;
  context.font = `${fontSize}px serif`; // TODO: make it configurable
  const epoch = scores.reduce((acc, cur) => {
    const start = new Date(cur.start).getTime();
    return acc < start ? acc : start;
  }, Infinity);
  const maxDuration = scores.reduce((acc, cur) => {
    return acc < cur.duration ? cur.duration : acc;
  }, 0);
  const canvasWidth = config.width;
  const graphOriginX = 30;
  const graphOriginY = 50;
  const ratio = (canvasWidth - graphOriginX) / maxDuration;
  // 行の高さ
  const lineHeight = 30;
  const colorScheme = (metric: Score): Color => {
    switch (metric.depth % 3) {
      case 0:
        return "#ff0000";
      case 1:
        return "#00ff00";
      case 2:
        return "#0000ff";
      default:
        return "#000000";
    }
  };
  const origin = {
    left: graphOriginX,
    top: graphOriginY,
  };
  verticalAxis(rc, context, scores, {
    epoch,
    ratio,
    colorScheme,
    origin,
    fontSize,
    lineHeight,
  });
  horizontalAxis(rc, context, scores, {
    epoch,
    ratio,
    colorScheme,
    origin,
    fontSize,
    lineHeight,
  });
  drawRectangles(rc, context, scores, {
    epoch,
    ratio,
    colorScheme,
    origin,
    fontSize,
    lineHeight,
  });
  render(canvas, config.outfilePath);
}

function verticalAxis(
  canvas: RoughCanvas,
  context: CanvasRenderingContext2D,
  scores: Score[],
  option: Option,
) {
  const maxDepth = scores.reduce((acc, cur) => {
    return acc < cur.depth ? cur.depth : acc;
  }, 0);
  canvas.line(
    option.origin.left,
    option.origin.top,
    option.origin.left,
    option.origin.top + (maxDepth + 1) * option.lineHeight,
    {
      stroke: "#000000",
      strokeWidth: 1,
      roughness: 0.5,
    },
  );
  for (let i = 0; i <= maxDepth; i++) {
    context.fillText(
      i.toString(),
      option.origin.left - 20,
      option.origin.top + (i + 0.5) * option.lineHeight + (option.fontSize || 0) / 2,
    );
  }
}

function horizontalAxis(
  canvas: RoughCanvas,
  context: CanvasRenderingContext2D,
  scores: Score[],
  option: Option,
) {
  const maxDuration = scores.reduce((acc, cur) => {
    return acc < cur.duration ? cur.duration : acc;
  }, 0);
  const line: Line = {
    from: {
      x: option.origin.left,
      y: option.origin.top,
    },
    to: {
      x: option.origin.left + maxDuration * option.ratio,
      y: option.origin.top,
    },
  };
  const ticks: TickAndLabel[] = [];
  for (let i = 1; i <= 10; i++) {
    ticks.push({
      top: option.origin.top,
      left: option.origin.left + (maxDuration / 10) * i * option.ratio,
      label: `${((maxDuration / 10) * i).toFixed(2)}ms`,
    });
  }

  canvas.line(line.from.x, line.from.y, line.to.x, line.to.y, {
    stroke: "#000000",
    strokeWidth: 1,
    roughness: 0,
  });
  ticks.forEach((tick) => {
    canvas.line(tick.left, tick.top, tick.left, tick.top - 10, {
      stroke: "#000000",
      strokeWidth: 1,
      roughness: 0.5,
    });
    context.fillText(tick.label, tick.left - 20, tick.top - 20);
  });
}

function drawRectangles(
  canvas: RoughCanvas,
  context: CanvasRenderingContext2D,
  scores: Score[],
  option: Option,
) {
  const rectangles = scores.map((score) => {
    return {
      left:
        (new Date(score.start).getTime() - option.epoch) * option.ratio +
        option.origin.left,
      top: score.depth * option.lineHeight + option.origin.top,
      width: score.duration * option.ratio,
      height: option.lineHeight,
      color: option.colorScheme(score),
      duration: score.duration,
      message: {
        value: score.name,
        position: "left",
      },
    };
  });
  rectangles.forEach((rectangle) => {
    canvas.rectangle(
      rectangle.left,
      rectangle.top,
      rectangle.width,
      rectangle.height,
      {
        fill: rectangle.color,
        roughness: 0,
      },
    );
    context.fillText(
      `${rectangle.message.value} ${rectangle.duration}ms`,
      rectangle.left,
      rectangle.top + option.lineHeight / 2,
    );
  });
}

function render(canvas: Canvas, outfilePath: string) {
  fs.writeFileSync(
    outfilePath,
    `<img src="${canvas.toDataURL()}" /><script>console.log("uuuu")</script>`,
  );
}
