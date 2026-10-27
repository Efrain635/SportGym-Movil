export interface BMIResult {
  currentBMI: number | null;
  minWeight: number;
  maxWeight: number;
  category: string;
  recommendation: string;
}

export function calculateBMI(weight: number, height: number): number {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
}

export function calculateHealthyWeightRange(height: number): {
  minWeight: number;
  maxWeight: number;
} {
  const heightInMeters = height / 100;
  const minWeight = 18.5 * (heightInMeters * heightInMeters);
  const maxWeight = 24.9 * (heightInMeters * heightInMeters);
  return {
    minWeight: Math.round(minWeight * 10) / 10,
    maxWeight: Math.round(maxWeight * 10) / 10,
  };
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Bajo peso";
  if (bmi < 24.9) return "Peso saludable";
  if (bmi < 29.9) return "Sobrepeso";
  return "Obesidad";
}

export function getBMIRecommendation(
  bmi: number,
  currentWeight: number,
  height: number,
  age?: number,
  goal?: string
): string {
  const { minWeight, maxWeight } = calculateHealthyWeightRange(height);
  const category = getBMICategory(bmi);

  let recommendation = "";

  if (bmi < 18.5) {
    recommendation = `Tu IMC indica bajo peso. El rango saludable para tu altura (${height} cm) es entre ${minWeight} kg y ${maxWeight} kg. Recomiendo aumentar el consumo de calorías y proteínas de forma gradual, priorizando alimentos densos en nutrientes.`;
  } else if (bmi < 24.9) {
    recommendation = `¡Excelente! Tu peso está dentro del rango saludable (${minWeight} kg - ${maxWeight} kg). Para mantener este estado, enfócate en mantener una alimentación balanceada y ejercicio regular.`;
  } else if (bmi < 29.9) {
    recommendation = `Tu IMC indica sobrepeso. El rango saludable para tu altura (${height} cm) es entre ${minWeight} kg y ${maxWeight} kg. Para bajar hacia el rango saludable, necesitas perder aproximadamente ${(currentWeight - maxWeight).toFixed(1)} kg. Combina ejercicio cardiovascular con una dieta controlada en calorías.`;
  } else {
    recommendation = `Tu IMC indica obesidad. El rango saludable para tu altura (${height} cm) es entre ${minWeight} kg y ${maxWeight} kg. Recomiendo consultar con un profesional de la salud para crear un plan seguro y efectivo. El objetivo inicial sería bajar gradualmente hacia el rango saludable.`;
  }

  if (goal) {
    recommendation += ` Ten en cuenta tu objetivo de ${goal.toLowerCase()}.`;
  }

  return recommendation;
}

export function getCompleteBMIAnalysis(
  weight: number,
  height: number,
  age?: number,
  goal?: string
): BMIResult {
  const currentBMI = calculateBMI(weight, height);
  const { minWeight, maxWeight } = calculateHealthyWeightRange(height);
  const category = getBMICategory(currentBMI);
  const recommendation = getBMIRecommendation(currentBMI, weight, height, age, goal);

  return {
    currentBMI: Math.round(currentBMI * 10) / 10,
    minWeight,
    maxWeight,
    category,
    recommendation,
  };
}
