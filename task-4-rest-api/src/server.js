import { createApp } from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => {
  console.log(`SaiKet Users API running on http://localhost:${PORT}`);
  console.log(`API explorer:  http://localhost:${PORT}/`);
});
