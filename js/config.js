/* Configuración pública de AlfombrArte.
   Solo la URL del proyecto y la clave PUBLICABLE de Supabase: nunca la service_role. */
window.ALFOMBRARTE_CONFIG = {
  supabaseUrl: "https://lsvhkqqqribpdqqcxgwt.supabase.co",
  supabaseKey: "sb_publishable_quoyp-ubNnfMF63zpXSPxg_qtMeT5DA",
  bucketImagenes: "imagenes-clientes",
  privacidadVersion: "2026-11",
  plazoRespuesta: "48 horas laborables",
  maxImagenMB: 10,

  // Fase 2 (no activa): enlace de pago de la señal generado a mano en Stripe.
  // Fase 3 (no activa): Checkout desde la web vía Edge Function.
  pagos: { activo: false, modo: null, edgeFunctionCheckout: null }
};
