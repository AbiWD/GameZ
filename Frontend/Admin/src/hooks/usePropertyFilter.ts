import { useProperty } from '../contexts/PropertyContext';

export function usePropertyFilter() {
  const { activeProperty } = useProperty();

  return activeProperty?.id && activeProperty.id !== 'default_prop'
    ? `(property_id = "${activeProperty.id.replace(/"/g, '\\"')}" || property_id = "" || property_id = null)`
    : '';
}
