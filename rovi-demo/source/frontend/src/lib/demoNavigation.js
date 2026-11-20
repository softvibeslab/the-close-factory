const DEMO_ROUTES = new Set(['/dashboard', '/leads', '/products', '/brokers/manage', '/calendar']);
export function filterDemoNavigation(items, environment) {
  return environment === 'provisa-demo' ? items.filter(item => DEMO_ROUTES.has(item.to)) : items;
}
