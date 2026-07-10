import { useProperty } from '../contexts/PropertyContext';

export function usePropertyFilter() {
  const { activeProperty } = useProperty();

  // Returns the base property filter string
  // It handles escaping the property ID just to be perfectly safe, though IDs rarely have quotes.
  return activeProperty?.id ? `property_id = "${activeProperty.id.replace(/"/g, '\\"')}"` : '';
}
