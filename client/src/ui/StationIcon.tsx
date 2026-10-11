import type { Role } from "@partyficrim/shared";
export function StationIcon({
  role,
  size = 24,
}: {
  role: Role;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {role === "defense" ? (
        <>
          <path d="M12 3 20 6v6q-1 6-8 9-7-3-8-9V6Z" />
          <path d="m8 12 3 3 5-6" />
        </>
      ) : role === "repair" ? (
        <>
          <path d="m14 4 1 4 4 1 2-3q2 8-5 8l-8 7-4-4 8-8q-2-6 2-5Z" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 1v4m0 14v4M1 12h4m14 0h4" />
        </>
      )}
    </svg>
  );
}
