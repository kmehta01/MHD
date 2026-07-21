export const messages = Object.freeze({
  English: {
    language: "Language", english: "English", spanish: "Español",
    home: "Home", about: "About Us", leadership: "Leadership", departments: "Departments",
    apply: "Apply for Services", submitTicket: "Submit Complaint Ticket", grievanceSubmission: "Grievance Submission",
    quickLinks: "Quick Links", keyServices: "Key Services", contactInfo: "Contact Info",
    address: "Address", email: "Email", hours: "Hours", privacyPolicy: "Privacy Policy",
    terms: "Terms of Use", accessibility: "Accessibility", sitemap: "Sitemap",
    loading: "Loading portal…", unavailable: "Portal temporarily unavailable",
    unavailableMessage: "Configuration could not be loaded. Please try again shortly.",
    maintenance: "Scheduled maintenance", grm: "Grievance Redress Mechanism",
    formTitle: "Grievance Submission Form",
    formIntro: "Submit a concern to the Ministry. Required fields are marked with an asterisk.",
    stepSubmission: "Submission", stepDetails: "Details", stepSupporting: "Supporting info", stepDeclaration: "Declaration",
    previous: "Previous", continue: "Continue", submit: "Submit grievance",
    track: "Track a grievance", trackOnline: "Track status online", another: "Submit another grievance",
    trackingReference: "Reference number", checkStatus: "Check status",
  },
  Spanish: {
    language: "Idioma", english: "Inglés", spanish: "Español",
    home: "Inicio", about: "Sobre nosotros", leadership: "Liderazgo", departments: "Departamentos",
    apply: "Solicitar servicios", submitTicket: "Presentar una queja", grievanceSubmission: "Presentación de quejas",
    quickLinks: "Enlaces rápidos", keyServices: "Servicios principales", contactInfo: "Información de contacto",
    address: "Dirección", email: "Correo electrónico", hours: "Horario", privacyPolicy: "Política de privacidad",
    terms: "Términos de uso", accessibility: "Accesibilidad", sitemap: "Mapa del sitio",
    loading: "Cargando el portal…", unavailable: "Portal temporalmente no disponible",
    unavailableMessage: "No se pudo cargar la configuración. Inténtelo de nuevo en breve.",
    maintenance: "Mantenimiento programado", grm: "Mecanismo de atención de quejas",
    formTitle: "Formulario de presentación de quejas",
    formIntro: "Presente una inquietud al Ministerio. Los campos obligatorios están marcados con un asterisco.",
    stepSubmission: "Presentación", stepDetails: "Detalles", stepSupporting: "Información de apoyo", stepDeclaration: "Declaración",
    previous: "Anterior", continue: "Continuar", submit: "Enviar queja",
    track: "Rastrear una queja", trackOnline: "Rastrear estado en línea", another: "Presentar otra queja",
    trackingReference: "Número de referencia", checkStatus: "Consultar estado",
  },
});

export const createTranslator = (language) => (key) =>
  messages[language]?.[key] ?? messages.English[key] ?? key;
