import { getShoppingPlan, saveShoppingPlan } from '../db/queries';
import {
  buildPlanPayload,
  isShoppingPlan,
  type PlanAbsence,
  type ShoppingPlan,
} from './shoppingPlan';

export async function planRequestFromStored(form: {
  days: number;
  startToday: boolean;
  absences: PlanAbsence[];
  note: string;
  date: string;
}) {
  return buildPlanPayload(form, await getShoppingPlan());
}

export async function commitPlanResult(result: ShoppingPlan | { fehler: string }): Promise<void> {
  if (!isShoppingPlan(result)) return;
  await saveShoppingPlan(result);
}
