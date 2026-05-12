export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Georgia, serif", background: "#faf8f5",
    }}>
      <p style={{ fontSize: 80, marginBottom: 0, opacity: 0.15 }}>404</p>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 400, marginBottom: 12 }}>
        Cotización no encontrada
      </h1>
      <p style={{ fontFamily: "system-ui", fontSize: 14, color: "#888" }}>
        El enlace puede haber expirado o ser inválido.
      </p>
    </div>
  );
}