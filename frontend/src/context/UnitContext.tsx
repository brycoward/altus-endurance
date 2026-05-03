import React, { createContext, useContext } from 'react';
import { useUser } from '../hooks/useAltus';

export type UnitSystem = 'metric' | 'imperial';

const UnitContext = createContext<UnitSystem>('metric');

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useUser();
  const unitSystem: UnitSystem = user?.unit_system === 'imperial' ? 'imperial' : 'metric';

  return (
    <UnitContext.Provider value={unitSystem}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnitSystem(): UnitSystem {
  return useContext(UnitContext);
}
