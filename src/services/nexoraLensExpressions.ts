export type NexoraFaceBlendshape = { categoryName?: string; score?: number };

export type NexoraFaceExpressions = {
  smile: number;
  jawOpen: number;
  blinkLeft: number;
  blinkRight: number;
  browRaise: number;
};

export type NexoraExpressionMotion = {
  scaleX: number;
  scaleY: number;
  lift: number;
  tilt: number;
  pitch: number;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const EMPTY: NexoraFaceExpressions = {
  smile: 0,
  jawOpen: 0,
  blinkLeft: 0,
  blinkRight: 0,
  browRaise: 0,
};

export function readNexoraFaceExpressions(
  categories: NexoraFaceBlendshape[] | undefined,
  previous: NexoraFaceExpressions = EMPTY,
  smoothing = 0.38,
): NexoraFaceExpressions {
  const values = new Map<string, number>();
  for (const item of categories || []) {
    if (typeof item.categoryName === 'string' && typeof item.score === 'number' && Number.isFinite(item.score)) {
      values.set(item.categoryName, clamp01(item.score));
    }
  }
  const target: NexoraFaceExpressions = {
    smile: Math.max(values.get('mouthSmileLeft') || 0, values.get('mouthSmileRight') || 0),
    jawOpen: values.get('jawOpen') || 0,
    blinkLeft: values.get('eyeBlinkLeft') || 0,
    blinkRight: values.get('eyeBlinkRight') || 0,
    browRaise: values.get('browInnerUp') || 0,
  };
  const alpha = clamp01(smoothing);
  return {
    smile: previous.smile + (target.smile - previous.smile) * alpha,
    jawOpen: previous.jawOpen + (target.jawOpen - previous.jawOpen) * alpha,
    blinkLeft: previous.blinkLeft + (target.blinkLeft - previous.blinkLeft) * alpha,
    blinkRight: previous.blinkRight + (target.blinkRight - previous.blinkRight) * alpha,
    browRaise: previous.browRaise + (target.browRaise - previous.browRaise) * alpha,
  };
}

export function getNexoraExpressionMotion(expressions: NexoraFaceExpressions): NexoraExpressionMotion {
  const blink = Math.max(expressions.blinkLeft, expressions.blinkRight);
  return {
    scaleX: 1 + expressions.smile * 0.055,
    scaleY: 1 - blink * 0.12 + expressions.jawOpen * 0.025,
    lift: expressions.browRaise * 0.055 + expressions.smile * 0.018,
    tilt: (expressions.smile - expressions.blinkLeft + expressions.blinkRight) * 0.045,
    pitch: expressions.jawOpen * 0.12,
  };
}
