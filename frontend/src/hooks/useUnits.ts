import { useUnitSystem, UnitSystem } from '../context/UnitContext';

export function useUnits() {
  const unit = useUnitSystem();

  return {
    unit,

    formatWeight: (kg: number): string => {
      if (unit === 'imperial') return `${(kg * 2.20462).toFixed(1)} lbs`;
      return `${kg.toFixed(1)} kg`;
    },

    formatHeight: (cm: number): string => {
      if (unit === 'imperial') {
        const totalInches = cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
      }
      return `${cm} cm`;
    },

    formatVolume: (ml: number): string => {
      if (unit === 'imperial') return `${(ml * 0.033814).toFixed(1)} fl oz`;
      return `${Math.round(ml)} ml`;
    },

    formatDistance: (km: number): string => {
      if (unit === 'imperial') return `${(km * 0.621371).toFixed(1)} mi`;
      return `${km.toFixed(1)} km`;
    },

    toUnit: {
      weight: (kg: number): number => unit === 'imperial' ? kg * 2.20462 : kg,
      height: (cm: number): number => unit === 'imperial' ? cm / 2.54 : cm,
      volume: (ml: number): number => unit === 'imperial' ? ml * 0.033814 : ml,
      distance: (km: number): number => unit === 'imperial' ? km * 0.621371 : km,
    },

    toMetric: {
      weight: (val: number): number => unit === 'imperial' ? val / 2.20462 : val,
      height: (val: number): number => unit === 'imperial' ? val * 2.54 : val,
      volume: (val: number): number => unit === 'imperial' ? val / 0.033814 : val,
      distance: (val: number): number => unit === 'imperial' ? val / 0.621371 : val,
    },

    label: {
      weight: unit === 'imperial' ? 'lbs' : 'kg',
      height: unit === 'imperial' ? 'in' : 'cm',
      volume: unit === 'imperial' ? 'fl oz' : 'ml',
      distance: unit === 'imperial' ? 'mi' : 'km',
    },
  };
}
