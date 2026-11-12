# TODOS

## UI polish

Rule: `.cursor/rules/ui-polish.mdc`. Do these in order. Leave copy and the dense Workout/Food layouts alone.

- [ ] **Spacing.** Replace off-scale gaps (`1`, `2`, `6`, `10`, `14`, `28`) in `screens/` and `components/` with `t.spacing`.
- [ ] **Type.** Replace ad-hoc `fontSize` values with `t.typography`. Keep the Home kcal figure at 48 / 800.
- [ ] **Color.** Move raw hex text colors onto `t.colors`. Category headers in `FoodScreen` (shopping list) use `secondaryLabel`, not accent.
- [ ] **Radius and borders.** Replace hardcoded `borderRadius` (`12`, `18`) with `t.radius`. Checkbox corners can stay a circle. Dividers use `StyleSheet.hairlineWidth` and `t.colors.separator`.
- [ ] **Home focus.** Nutrition kcal and the workout card stay the loud blocks. "View all nutrients" and "Open the cookbook" stay tint text, quieter than the kcal number.
- [ ] **Motion, only if a gesture feels disconnected.** Sheet, swipe-to-delete, rest-timer cue. Use the `animate-expo` skill. Do not animate logging, tabs, or toggles.

## Native iOS redesign

- [ ] **Before Phase 2 (Live Activity): confirm Apple-ID/account requirement.**
  Verify the free-Apple-ID standalone build (7-day reinstall) can carry a
  WidgetKit / ActivityKit widget-extension target. Live Activities may require a
  paid Apple Developer account or a provisioning profile a free account can't
  produce. Check this before investing in the SwiftUI lock-screen + Dynamic
  Island layout, not after.
  _Context: phase 2 of the redesign (rest-timer Live Activity). Design doc:_
  _~/.gstack/projects/FitMitFlip/philipp-main-design-20260605-220349.md_
