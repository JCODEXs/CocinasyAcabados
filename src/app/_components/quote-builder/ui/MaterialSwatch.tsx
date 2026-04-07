export function MaterialSwatch({
  color,
  textureUrl,
  size = "md",
}: {
  color?: string | null;
  textureUrl?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  if (textureUrl) {
    return (
      <div
        className={`${dim} shrink-0 rounded border border-gray-200 bg-cover bg-center dark:border-gray-700`}
        style={{ backgroundImage: `url(${textureUrl})` }}
      />
    );
  }
  return (
    <div
      className={`${dim} shrink-0 rounded border border-gray-200 dark:border-gray-700`}
      style={{ backgroundColor: color ?? "#e5e7eb" }}
    />
  );
}