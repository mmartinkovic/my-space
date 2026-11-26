const octetPattern = /^(0|[1-9]\d{0,2})$/;

/** Strict dotted-quad IPv4 check: four decimal octets 0-255 without leading zeros. */
export const isIpv4Address = (text: string): boolean => {
  const octets = text.split('.');
  return (
    octets.length === 4 && octets.every((octet) => octetPattern.test(octet) && Number(octet) <= 255)
  );
};
