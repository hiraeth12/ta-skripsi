Act as an expert React Native/TypeScript developer and software engineer.
I need to refactor the earthquake hazard radius calculation in my application to be scientifically accurate. Currently, the code uses a heuristic approximation. I want to replace this with the scientifically recognized Esteva (1970) Intensity Prediction Equation.

**Target Context:**
The calculation happens in components dealing with earthquake spatial data (e.g., `gempa-dirasakan-content.tsx` and potentially `earthquake-map.tsx`). The variables `M` (Magnitude) and `D` (Depth in km) are provided.

**Task 1: Remove the old heuristic logic**
Locate and delete the old heuristic radius calculation block that looks similar to this:
```typescript
const s = clamp(Math.pow(10, 0.5 * (M - 5)), 0.05, 3.5);
const fd = clamp(1 / (1 + D / 200), 0.35, 1);
const Router = (100000 + 240000 * s) * fd;
const Rinner = (35000 + 80000 * s) * fd;
```

***Task 2: Implement the new Esteva Model**
Create a new helper function to calculate the epicentral radius (in kilometers) based on a target Modified Mercalli Intensity (MMI). Insert this function above your component or in your utility file:

/**
 * Calculates the epicentral radius (in km) based on the Esteva (1970) attenuation model.
 * @param M - Earthquake Magnitude
 * @param D - Hypocentral Depth (in km)
 * @param targetMMI - The desired Modified Mercalli Intensity threshold
 */
function calculateRadiusByMMI(M: number, D: number, targetMMI: number): number {
  const exponent = (1.45 * M + 8.16 - targetMMI) / 2.46;
  const rHypo = Math.exp(exponent);
  const rEpiSquared = Math.pow(rHypo, 2) - Math.pow(D, 2);
  // Use Math.max to prevent NaN if the earthquake is too deep to reach the target intensity at the surface
  return Math.sqrt(Math.max(0, rEpiSquared));
}

**Task 3: Apply the new variables**
Replace the removed variables by calculating the new boundaries based on MMI thresholds (MMI 5.0 for the inner critical zone, MMI 4.0 for the outer awareness zone). Multiply by 1000 to keep the output in meters, ensuring downward compatibility with the existing map rendering and wave animation logic:
```typescript
const Rinner_km = calculateRadiusByMMI(M, D, 5.0);
const Router_km = calculateRadiusByMMI(M, D, 4.0);

const Rinner = Rinner_km * 1000;
const Router = Router_km * 1000;
```

**Task 4: Verification**
Ensure there are no TypeScript errors and that downstream variables (like Rkm or Rinner,anim(t)) still receive Router and Rinner in meters. Do not modify the animation logic ((t % 3000) / 3000) unless necessary for type fixing.