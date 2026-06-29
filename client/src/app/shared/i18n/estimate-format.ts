import { DecimalPipe } from '@angular/common';

import { EstimateValue } from '../../session/models/planning-round';

export function formatAppEstimate(value: number | null | undefined, locale: string, openLabel = 'Open'): string {
  if (value === null || value === undefined) {
    return openLabel;
  }

  return new DecimalPipe(locale).transform(value, '1.0-1') ?? String(value);
}

export function formatEstimateCard(value: EstimateValue): EstimateValue {
  return value;
}
