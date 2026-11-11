import test from 'node:test';
import assert from 'node:assert/strict';
import { getNexoraExpressionMotion, readNexoraFaceExpressions } from '../src/services/nexoraLensExpressions';

test('face blendshapes are normalized and mapped to stable NEXORA expression signals', () => {
  const expressions = readNexoraFaceExpressions([
    { categoryName: 'mouthSmileLeft', score: 0.8 },
    { categoryName: 'mouthSmileRight', score: 0.6 },
    { categoryName: 'jawOpen', score: 0.4 },
    { categoryName: 'eyeBlinkLeft', score: 1.4 },
    { categoryName: 'browInnerUp', score: -0.5 },
  ], undefined, 1);
  assert.deepEqual(expressions, { smile: 0.8, jawOpen: 0.4, blinkLeft: 1, blinkRight: 0, browRaise: 0 });
});

test('expression smoothing prevents abrupt accessory jumps', () => {
  const expressions = readNexoraFaceExpressions([{ categoryName: 'mouthSmileLeft', score: 1 }], undefined, 0.25);
  assert.equal(expressions.smile, 0.25);
});

test('expression motion remains subtle and bounded for AR accessories', () => {
  const motion = getNexoraExpressionMotion({ smile: 1, jawOpen: 1, blinkLeft: 1, blinkRight: 0, browRaise: 1 });
  assert.ok(motion.scaleX <= 1.06 && motion.scaleX >= 1);
  assert.ok(motion.scaleY <= 1.03 && motion.scaleY >= 0.87);
  assert.ok(motion.lift <= 0.08);
  assert.ok(motion.tilt <= 0.1 && motion.tilt >= -0.1);
  assert.ok(motion.pitch <= 0.12);
});

test('missing and malformed blendshape scores safely produce neutral expressions', () => {
  assert.deepEqual(readNexoraFaceExpressions([
    { categoryName: 'jawOpen', score: Number.NaN },
    { categoryName: 'mouthSmileLeft', score: 'high' as unknown as number },
  ], undefined, 1), { smile: 0, jawOpen: 0, blinkLeft: 0, blinkRight: 0, browRaise: 0 });
});
