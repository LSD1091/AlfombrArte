/* Trufing · main.js
   Un único script para todo el sitio. Cada módulo se activa solo si
   encuentra en la página el elemento que lo necesita (data-atributos). */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  // Raíz del sitio, deducida de la ubicación de este script (funciona en
  // subcarpetas como /legal/ y en GitHub Pages bajo /<repo>/).
  var BASE = new URL("../", document.currentScript.src);
  var ruta = function (rel) { return new URL(rel, BASE).href; };

  var CATEGORIAS = {
    idea: "Idea",
    hechas: "Ya realizada",
    inspiracion: "Inspiración"
  };

  /* Utilidades --------------------------------------------------------- */
  function el(tag, attrs, hijos) {
    var nodo = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "texto") nodo.textContent = attrs[k];
      else if (k === "clase") nodo.className = attrs[k];
      else nodo.setAttribute(k, attrs[k]);
    });
    (hijos || []).forEach(function (h) { if (h) nodo.appendChild(h); });
    return nodo;
  }

  function euros(n) {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }

  var catalogoPromesa = null;
  function cargarCatalogo() {
    if (!catalogoPromesa) {
      catalogoPromesa = fetch(ruta("data/catalogo.json"))
        .then(function (r) {
          if (!r.ok) throw new Error("No se pudo cargar el catálogo (" + r.status + ")");
          return r.json();
        })
        .then(function (d) { return d.alfombras || []; });
    }
    return catalogoPromesa;
  }

  // Foto con srcset WebP; si aún no hay fotos, el boceto SVG o un placeholder.
  function foto(alfombra, indice, opciones) {
    opciones = opciones || {};
    var f = (alfombra.fotos || [])[indice || 0];
    var cont = el("div", { clase: "foto" });
    if (!f && alfombra.boceto && !indice) {
      cont.classList.add("foto--boceto");
      cont.appendChild(el("img", {
        src: ruta(alfombra.boceto),
        alt: "Boceto de la alfombra " + alfombra.nombre,
        loading: opciones.eager ? "eager" : "lazy",
        decoding: "async",
        width: "400",
        height: "500"
      }));
    } else if (f) {
      if (f.recreacion) cont.classList.add("foto--recreacion");
      var base = ruta("img/catalogo/" + alfombra.id + "/" + f.archivo);
      cont.appendChild(el("img", {
        src: base + "-800.webp",
        srcset: base + "-800.webp 800w, " + base + "-1600.webp 1600w",
        sizes: opciones.sizes || "(min-width: 64rem) 33vw, (min-width: 36rem) 50vw, 100vw",
        alt: f.alt || alfombra.nombre,
        loading: opciones.eager ? "eager" : "lazy",
        decoding: "async",
        width: "800",
        height: "1000"
      }));
    } else {
      var p = alfombra.placeholder || {};
      cont.classList.add("foto--placeholder", "tono-" + (p.tono || "lino"));
      cont.setAttribute("role", "img");
      cont.setAttribute("aria-label", "Foto pendiente: " + (p.etiqueta || alfombra.nombre));
      cont.setAttribute("data-etiqueta", "FOTO: " + (p.etiqueta || alfombra.nombre));
    }
    return cont;
  }

  function tarjeta(a) {
    var enlace = el("a", { href: ruta("alfombra.html?id=" + encodeURIComponent(a.id)), texto: a.nombre });
    var meta = el("p", { clase: "tarjeta__meta" }, [
      el("span", { texto: a.medidas && a.medidas.length ? "Desde " + a.medidas[0].ancho + " × " + a.medidas[0].largo + " cm" : "A medida" }),
      a.precio_desde ? el("span", { clase: "tarjeta__precio", texto: "desde " + euros(a.precio_desde) }) : null
    ]);
    return el("article", { clase: "tarjeta revelar", "data-categoria": a.categoria }, [
      foto(a, 0),
      el("p", { clase: "tarjeta__cat", texto: CATEGORIAS[a.categoria] || a.categoria }),
      el("h3", {}, [enlace]),
      meta
    ]);
  }

  /* Cabecera y menú ---------------------------------------------------- */
  function iniciarCabecera() {
    var cab = document.querySelector(".cabecera");
    var boton = document.querySelector(".menu-boton");
    var nav = document.getElementById("nav-principal");
    if (!cab) return;

    var alScroll = function () { cab.classList.toggle("con-scroll", window.scrollY > 8); };
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });

    if (!boton || !nav) return;
    var cerrar = function () {
      boton.setAttribute("aria-expanded", "false");
      nav.classList.remove("abierta");
    };
    boton.addEventListener("click", function () {
      var abrir = boton.getAttribute("aria-expanded") !== "true";
      boton.setAttribute("aria-expanded", String(abrir));
      nav.classList.toggle("abierta", abrir);
      if (abrir) { var primero = nav.querySelector("a"); if (primero) primero.focus(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("abierta")) { cerrar(); boton.focus(); }
    });
    window.matchMedia("(min-width: 60rem)").addEventListener("change", cerrar);
  }

  /* Aparición suave al hacer scroll ----------------------------------- */
  var observador = null;
  function revelar(raiz) {
    var nodos = (raiz || document).querySelectorAll(".revelar:not(.visible)");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodos.forEach(function (n) { n.classList.add("visible"); });
      return;
    }
    if (!observador) {
      observador = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("visible"); observador.unobserve(en.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    }
    nodos.forEach(function (n) { observador.observe(n); });
  }

  /* Destacadas (Inicio) ------------------------------------------------ */
  function iniciarDestacadas() {
    var cont = document.querySelector("[data-destacadas]");
    if (!cont) return;
    var max = parseInt(cont.getAttribute("data-destacadas"), 10) || 3;
    cargarCatalogo().then(function (lista) {
      var sel = lista.filter(function (a) { return a.destacada; }).slice(0, max);
      cont.textContent = "";
      sel.forEach(function (a) { cont.appendChild(tarjeta(a)); });
      revelar(cont);
    }).catch(function () {
      cont.innerHTML = '<p class="rejilla__vacia">No hemos podido cargar las alfombras. <a href="' + ruta("catalogo.html") + '">Ver el catálogo</a>.</p>';
    });
  }

  /* Catálogo filtrable ------------------------------------------------- */
  function iniciarCatalogo() {
    var cont = document.querySelector("[data-catalogo]");
    if (!cont) return;
    var botones = document.querySelectorAll("[data-filtro]");
    var estado = document.querySelector("[data-catalogo-estado]");
    var lista = [];

    function pintar(cat) {
      var visibles = lista.filter(function (a) { return cat === "todas" || a.categoria === cat; });
      cont.textContent = "";
      visibles.forEach(function (a) { cont.appendChild(tarjeta(a)); });
      if (!visibles.length) cont.appendChild(el("p", { clase: "rejilla__vacia", texto: "Todavía no hay alfombras en esta categoría." }));
      botones.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filtro") === cat)); });
      if (estado) estado.textContent = visibles.length === 1 ? "1 alfombra" : visibles.length + " alfombras";
      revelar(cont);
    }

    function categoriaDeUrl() {
      var c = new URLSearchParams(location.search).get("categoria");
      return c && CATEGORIAS[c] ? c : "todas";
    }

    botones.forEach(function (b) {
      b.addEventListener("click", function () {
        var cat = b.getAttribute("data-filtro");
        var url = new URL(location.href);
        if (cat === "todas") url.searchParams.delete("categoria"); else url.searchParams.set("categoria", cat);
        history.replaceState(null, "", url);
        pintar(cat);
      });
    });

    cargarCatalogo().then(function (datos) {
      lista = datos;
      botones.forEach(function (b) {
        var cat = b.getAttribute("data-filtro");
        var n = cat === "todas" ? lista.length : lista.filter(function (a) { return a.categoria === cat; }).length;
        var span = b.querySelector(".filtro__n");
        if (span) span.textContent = n;
      });
      pintar(categoriaDeUrl());
    }).catch(function () {
      cont.innerHTML = '<p class="rejilla__vacia">No hemos podido cargar el catálogo. Recarga la página o <a href="' + ruta("contacto.html") + '">escríbenos</a>.</p>';
    });
  }

  /* Ficha de alfombra -------------------------------------------------- */
  var FORMAS = { rectangular: "rectangular", redonda: "redonda", irregular: "forma libre" };
  var mayuscula = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  function iniciarFicha() {
    var raiz = document.querySelector("[data-ficha]");
    if (!raiz) return;
    var id = new URLSearchParams(location.search).get("id");

    cargarCatalogo().then(function (lista) {
      var a = lista.filter(function (x) { return x.id === id; })[0];
      if (!a) { mostrarVacia(); return; }
      pintarFicha(a, lista);
    }).catch(mostrarVacia);

    function mostrarVacia() {
      raiz.hidden = true;
      document.querySelectorAll(".migas, [data-ficha-otras]").forEach(function (n) { (n.closest("section") || n).hidden = true; });
      var v = document.querySelector("[data-ficha-vacia]");
      if (v) v.hidden = false;
      document.title = "Alfombra no encontrada · Trufing";
      var robots = el("meta", { name: "robots", content: "noindex" });
      document.head.appendChild(robots);
    }
  }

  function pintarFicha(a, lista) {
    var cat = CATEGORIAS[a.categoria] || a.categoria;
    var urlFicha = ruta("alfombra.html?id=" + encodeURIComponent(a.id));
    var urlPedir = ruta("encargar.html?tipo=catalogo&modelo=" + encodeURIComponent(a.id));

    // Metadatos de la página
    document.title = a.nombre + " · Alfombra hecha a mano por encargo · Trufing";
    var setMeta = function (sel, valor) { var m = document.querySelector(sel); if (m) m.setAttribute("content", valor); };
    setMeta('meta[name="description"]', a.nombre + ": " + a.descripcion);
    setMeta('meta[property="og:title"]', a.nombre + " · Trufing");
    setMeta('meta[property="og:description"]', a.descripcion);
    var canon = document.querySelector('link[rel="canonical"]');
    if (canon) canon.href = canon.href.split("?")[0] + "?id=" + encodeURIComponent(a.id);

    // Migas
    document.querySelectorAll("[data-ficha-cat]").forEach(function (n) {
      n.textContent = cat;
      if (n.tagName === "A") n.href = ruta("catalogo.html?categoria=" + a.categoria);
    });
    document.querySelectorAll("[data-ficha-nombre]").forEach(function (n) { n.textContent = a.nombre; });

    // Galería
    var principal = document.querySelector("[data-galeria-principal]");
    var minis = document.querySelector("[data-galeria-miniaturas]");
    var total = Math.max((a.fotos || []).length, 1);
    var mostrar = function (i) {
      var nueva = foto(a, i, { eager: true, sizes: "(min-width: 56rem) 55vw, 100vw" });
      nueva.classList.add("galeria__principal");
      principal.replaceWith(nueva);
      principal = nueva;
      if (minis) minis.querySelectorAll("button").forEach(function (b, j) { b.setAttribute("aria-current", String(i === j)); });
    };
    mostrar(0);
    if (minis && total > 1) {
      for (var i = 0; i < total; i++) {
        (function (i) {
          var b = el("button", { type: "button", "aria-label": "Ver foto " + (i + 1) + " de " + total, "aria-current": String(i === 0) },
            [foto(a, i, { sizes: "72px" })]);
          b.addEventListener("click", function () { mostrar(i); });
          minis.appendChild(el("li", {}, [b]));
        })(i);
      }
    }

    // Texto y datos
    document.querySelector("[data-ficha-desc]").textContent = a.descripcion;
    var precio = document.querySelector("[data-ficha-precio]");
    if (a.precio_desde) {
      precio.textContent = "desde " + euros(a.precio_desde);
      precio.appendChild(el("small", { texto: "Precio orientativo. El final depende de la medida y los colores." }));
    } else {
      precio.textContent = "Precio según presupuesto";
    }

    var datos = document.querySelector("[data-ficha-datos]");
    var fila = function (titulo, contenido) {
      datos.appendChild(el("div", {}, [el("dt", { texto: titulo }), el("dd", {}, [contenido])]));
    };
    fila("Medidas", document.createTextNode(
      (a.medidas || []).map(function (m) {
        return m.ancho === m.largo && (a.formas || []).indexOf("redonda") > -1 ? "Ø " + m.ancho + " cm" : m.ancho + " × " + m.largo + " cm";
      }).concat((a.medidas || []).length ? "o a tu medida" : "A tu medida").join(" · ")
    ));
    fila("Formas", document.createTextNode(mayuscula((a.formas || []).map(function (f) { return FORMAS[f] || f; }).join(", ")) || "A consultar"));
    var colores;
    if (a.colores && a.colores.length) {
      colores = el("ul", { clase: "muestras" }, a.colores.map(function (c) {
        var m = el("span", { clase: "muestra", "aria-hidden": "true" });
        m.style.setProperty("--c", c.hex);
        return el("li", {}, [m, document.createTextNode(c.nombre)]);
      }));
    } else {
      colores = document.createTextNode("Los que elijas");
    }
    fila("Colores", colores);
    fila("Plazo", document.createTextNode("2–4 semanas de fabricación"));

    document.querySelectorAll("[data-ficha-pedir]").forEach(function (b) { b.href = urlPedir; });

    // Otras alfombras de la misma categoría
    var otras = document.querySelector("[data-ficha-otras]");
    if (otras) {
      lista.filter(function (x) { return x.id !== a.id && x.categoria === a.categoria; }).slice(0, 3)
        .forEach(function (x) { otras.appendChild(tarjeta(x)); });
      if (!otras.children.length) otras.closest("section").hidden = true;
      revelar(otras);
    }

    // Datos estructurados Product
    var producto = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: a.nombre,
      description: a.descripcion,
      category: "Alfombras hechas a mano",
      brand: { "@type": "Brand", name: "Trufing" },
      url: urlFicha,
      image: (a.fotos || []).map(function (f) { return ruta("img/catalogo/" + a.id + "/" + f.archivo + "-1600.webp"); })
    };
    if (a.precio_desde) {
      producto.offers = {
        "@type": "AggregateOffer",
        priceCurrency: "EUR",
        lowPrice: a.precio_desde,
        availability: "https://schema.org/MadeToOrder",
        areaServed: "ES"
      };
    }
    document.head.appendChild(el("script", { type: "application/ld+json", texto: JSON.stringify(producto) }));

    document.querySelector("[data-ficha]").removeAttribute("aria-busy");
  }

  /* Formulario de encargo ---------------------------------------------- */
  // Plantilla única: se usa en encargar.html y en tu-diseno.html
  // (<div data-form-encargo data-tipo="...">).
  var PLANTILLA_FORM = '' +
    '<form class="formulario" novalidate>' +
    '  <div class="resumen-errores" tabindex="-1" data-resumen></div>' +

    '  <fieldset class="bloque">' +
    '    <legend><span class="bloque__num">01</span> ¿Qué quieres encargar?</legend>' +
    '    <div class="opciones opciones--3" role="radiogroup" aria-describedby="e-tipo">' +
    '      <div class="opcion"><input type="radio" name="tipo" id="tipo-catalogo" value="catalogo"><label for="tipo-catalogo"><strong>Un modelo del catálogo</strong><span>A tu medida y colores</span></label></div>' +
    '      <div class="opcion"><input type="radio" name="tipo" id="tipo-propio" value="diseno_propio"><label for="tipo-propio"><strong>Mi propio diseño</strong><span>Logo, dibujo o foto</span></label></div>' +
    '      <div class="opcion"><input type="radio" name="tipo" id="tipo-idea" value="idea_libre"><label for="tipo-idea"><strong>Una idea libre</strong><span>Te la describo</span></label></div>' +
    '    </div>' +
    '    <p class="error" id="e-tipo" aria-live="polite"></p>' +
    '    <div class="campo" data-solo-tipo="catalogo">' +
    '      <label for="modelo">Modelo de referencia</label>' +
    '      <select id="modelo" name="modelo_ref" aria-describedby="e-modelo"><option value="">Elige un modelo…</option></select>' +
    '      <p class="error" id="e-modelo" aria-live="polite"></p>' +
    '    </div>' +
    '  </fieldset>' +

    '  <fieldset class="bloque">' +
    '    <legend><span class="bloque__num">02</span> Medida y forma</legend>' +
    '    <div class="opciones opciones--3" role="radiogroup" aria-label="Forma" aria-describedby="e-forma">' +
    '      <div class="opcion"><input type="radio" name="forma" id="forma-rect" value="rectangular"><label for="forma-rect"><strong>Rectangular</strong></label></div>' +
    '      <div class="opcion"><input type="radio" name="forma" id="forma-red" value="redonda"><label for="forma-red"><strong>Redonda</strong></label></div>' +
    '      <div class="opcion"><input type="radio" name="forma" id="forma-irr" value="irregular"><label for="forma-irr"><strong>Forma libre</strong></label></div>' +
    '    </div>' +
    '    <p class="error" id="e-forma" aria-live="polite"></p>' +
    '    <div class="campos-fila" data-medidas>' +
    '      <div class="campo"><label for="ancho" data-etq-ancho>Ancho</label><div class="campo__unidad"><input type="number" id="ancho" name="ancho_cm" inputmode="numeric" min="30" max="600" step="1" aria-describedby="a-medida e-ancho"><span aria-hidden="true">cm</span></div><p class="error" id="e-ancho" aria-live="polite"></p></div>' +
    '      <div class="campo" data-campo-largo><label for="largo">Largo</label><div class="campo__unidad"><input type="number" id="largo" name="largo_cm" inputmode="numeric" min="30" max="600" step="1" aria-describedby="a-medida e-largo"><span aria-hidden="true">cm</span></div><p class="error" id="e-largo" aria-live="polite"></p></div>' +
    '    </div>' +
    '    <p class="campo__ayuda" id="a-medida">Entre 30 y 600 cm. Si es de forma libre, indica el rectángulo que la contiene.</p>' +
    '  </fieldset>' +

    '  <fieldset class="bloque">' +
    '    <legend><span class="bloque__num">03</span> Tu idea</legend>' +
    '    <div class="campos-fila">' +
    '      <div class="campo"><label for="colores">Colores deseados <span class="campo__opcional">(opcional)</span></label><input type="text" id="colores" name="colores" maxlength="500" placeholder="Ej.: terracota, crudo y un toque de verde"></div>' +
    '      <div class="campo"><label for="estancia">Uso o estancia <span class="campo__opcional">(opcional)</span></label><select id="estancia" name="estancia"><option value="">Elige…</option><option>Salón</option><option>Dormitorio</option><option>Habitación infantil</option><option>Recibidor o pasillo</option><option>Baño</option><option>Oficina o negocio</option><option>Para colgar en la pared</option><option>Regalo</option><option>Otro</option></select></div>' +
    '    </div>' +
    '    <div class="campo"><label for="descripcion">Cuéntanos más <span class="campo__opcional" data-desc-opcional>(opcional)</span></label><textarea id="descripcion" name="descripcion" maxlength="3000" aria-describedby="a-desc e-desc"></textarea><p class="campo__ayuda" id="a-desc">Lo que quieras que sepamos: estilo, referencias, si es un regalo, fechas…</p><p class="error" id="e-desc" aria-live="polite"></p></div>' +
    '    <div class="campo">' +
    '      <span class="campo__titulo" id="t-imagen">Imagen <span class="campo__opcional" data-img-opcional>(opcional)</span></span>' +
    '      <div class="subida" data-subida>' +
    '        <input type="file" id="imagen" name="imagen" accept="image/jpeg,image/png,image/webp" aria-labelledby="t-imagen" aria-describedby="a-imagen e-imagen">' +
    '        <svg viewBox="0 0 36 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="5" y="7" width="26" height="22" rx="2"/><circle cx="13" cy="15" r="2.5"/><path d="M5 25l8-7 6 5 4-3 8 6"/></svg>' +
    '        <p class="subida__texto" style="margin:0"><strong>Elige una imagen</strong> o arrástrala aquí</p>' +
    '        <p class="campo__ayuda" id="a-imagen">JPG, PNG o WebP · máximo 10 MB</p>' +
    '      </div>' +
    '      <div class="vista-previa" data-vista-previa hidden><img alt="Vista previa de la imagen elegida" data-previa-img><div class="vista-previa__datos"><strong data-previa-nombre></strong><span data-previa-peso></span></div><button type="button" class="boton-texto" data-quitar-imagen>Quitar</button></div>' +
    '      <p class="error" id="e-imagen" aria-live="polite"></p>' +
    '    </div>' +
    '  </fieldset>' +

    '  <fieldset class="bloque">' +
    '    <legend><span class="bloque__num">04</span> Tus datos</legend>' +
    '    <div class="campo"><label for="nombre">Nombre</label><input type="text" id="nombre" name="nombre" autocomplete="name" maxlength="120" aria-describedby="e-nombre"><p class="error" id="e-nombre" aria-live="polite"></p></div>' +
    '    <div class="campos-fila">' +
    '      <div class="campo"><label for="email">Email</label><input type="email" id="email" name="email" autocomplete="email" inputmode="email" maxlength="254" aria-describedby="a-email e-email"><p class="campo__ayuda" id="a-email">Te enviaremos aquí el presupuesto.</p><p class="error" id="e-email" aria-live="polite"></p></div>' +
    '      <div class="campo"><label for="telefono">Teléfono <span class="campo__opcional">(opcional)</span></label><input type="tel" id="telefono" name="telefono" autocomplete="tel" inputmode="tel" maxlength="30" aria-describedby="e-telefono"><p class="error" id="e-telefono" aria-live="polite"></p></div>' +
    '    </div>' +
    '    <div class="campo-trampa" aria-hidden="true"><label for="web">No rellenes este campo</label><input type="text" id="web" name="web" tabindex="-1" autocomplete="off"></div>' +
    '    <p class="info-rgpd"><strong>Información básica sobre protección de datos.</strong> Responsable: Trufos S.L. Finalidad: responder a tu solicitud y prepararte un presupuesto. Legitimación: tu consentimiento y la aplicación de medidas precontractuales. Destinatarios: no se ceden datos a terceros, salvo proveedores de alojamiento (Supabase, servidores en la UE). Derechos: acceso, rectificación, supresión y otros, como se explica en la <a href="{{privacidad}}">política de privacidad</a>.</p>' +
    '    <div class="campo"><div class="casilla"><input type="checkbox" id="privacidad" name="acepta_privacidad" aria-describedby="e-privacidad"><label for="privacidad">He leído y acepto la <a href="{{privacidad}}" target="_blank" rel="noopener">política de privacidad</a>.</label></div><p class="error" id="e-privacidad" aria-live="polite"></p></div>' +
    '  </fieldset>' +

    '  <div class="formulario__envio">' +
    '    <p class="aviso-envio" role="alert" tabindex="-1" data-aviso></p>' +
    '    <button class="boton" type="submit" data-enviar><span data-enviar-texto>Enviar solicitud</span><svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 10h12M11 5l5 5-5 5"/></svg></button>' +
    '    <p class="campo__ayuda">Sin compromiso. Te respondemos en {{plazo}}.</p>' +
    '  </div>' +
    '</form>';

  var TIPOS_IMAGEN = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  function iniciarFormulario() {
    var cont = document.querySelector("[data-form-encargo]");
    if (!cont) return;
    var cfg = window.TRUFING_CONFIG || {};
    var maxBytes = (cfg.maxImagenMB || 10) * 1024 * 1024;

    cont.innerHTML = PLANTILLA_FORM
      .split("{{privacidad}}").join(ruta("legal/privacidad.html"))
      .split("{{plazo}}").join(cfg.plazoRespuesta || "48 horas");
    var form = cont.querySelector("form");
    var $ = function (sel) { return form.querySelector(sel); };
    var params = new URLSearchParams(location.search);
    var imagen = null;
    var enviando = false;
    var intentado = false;

    // Valores iniciales: atributo de la página o parámetros de la URL
    var tipoInicial = params.get("tipo") || cont.getAttribute("data-tipo") || (params.get("modelo") ? "catalogo" : "");
    var radioTipo = form.querySelector('input[name="tipo"][value="' + tipoInicial + '"]');
    if (radioTipo) radioTipo.checked = true;

    // Modelos del catálogo
    var selectModelo = $("#modelo");
    cargarCatalogo().then(function (lista) {
      var grupos = {};
      lista.forEach(function (a) { (grupos[a.categoria] = grupos[a.categoria] || []).push(a); });
      Object.keys(grupos).forEach(function (cat) {
        var og = el("optgroup", { label: CATEGORIAS[cat] || cat });
        grupos[cat].forEach(function (a) { og.appendChild(el("option", { value: a.id, texto: a.nombre })); });
        selectModelo.appendChild(og);
      });
      var m = params.get("modelo");
      if (m && lista.some(function (a) { return a.id === m; })) {
        selectModelo.value = m;
        var a = lista.filter(function (x) { return x.id === m; })[0];
        // Proponer la primera medida y forma del modelo si aún están vacías
        if (a.formas && a.formas.length && !form.querySelector('input[name="forma"]:checked')) {
          var r = form.querySelector('input[name="forma"][value="' + a.formas[0] + '"]');
          if (r) r.checked = true;
        }
        if (a.medidas && a.medidas.length && !$("#ancho").value) {
          $("#ancho").value = a.medidas[0].ancho;
          $("#largo").value = a.medidas[0].largo;
        }
        actualizarVisibilidad();
      }
    }).catch(function () { /* el select queda vacío; el campo no es imprescindible */ });

    function tipo() { var r = form.querySelector('input[name="tipo"]:checked'); return r ? r.value : ""; }
    function forma() { var r = form.querySelector('input[name="forma"]:checked'); return r ? r.value : ""; }

    function actualizarVisibilidad() {
      var t = tipo();
      form.querySelectorAll("[data-solo-tipo]").forEach(function (n) { n.hidden = n.getAttribute("data-solo-tipo") !== t; });
      var redonda = forma() === "redonda";
      form.querySelector("[data-campo-largo]").hidden = redonda;
      form.querySelector("[data-etq-ancho]").textContent = redonda ? "Diámetro" : "Ancho";
      form.querySelector("[data-img-opcional]").hidden = t === "diseno_propio";
      form.querySelector("[data-desc-opcional]").hidden = t === "idea_libre";
    }
    actualizarVisibilidad();

    // Validación ---------------------------------------------------------
    function entero(v) { return /^\d+$/.test(String(v).trim()) ? parseInt(v, 10) : NaN; }
    var reglas = {
      tipo: function () { return tipo() ? "" : "Elige qué quieres encargar."; },
      modelo: function () { return tipo() === "catalogo" && !selectModelo.value ? "Elige el modelo del catálogo que te interesa." : ""; },
      forma: function () { return forma() ? "" : "Elige la forma de la alfombra."; },
      ancho: function () {
        var n = entero($("#ancho").value), q = forma() === "redonda" ? "el diámetro" : "el ancho";
        if (!$("#ancho").value.trim()) return "Indica " + q + " en centímetros.";
        return n >= 30 && n <= 600 ? "" : "Indica " + q + " en centímetros enteros, entre 30 y 600.";
      },
      largo: function () {
        if (forma() === "redonda") return "";
        var n = entero($("#largo").value);
        if (!$("#largo").value.trim()) return "Indica el largo en centímetros.";
        return n >= 30 && n <= 600 ? "" : "Indica el largo en centímetros enteros, entre 30 y 600.";
      },
      desc: function () {
        return tipo() === "idea_libre" && $("#descripcion").value.trim().length < 10 ? "Descríbenos tu idea en unas palabras (al menos 10 caracteres)." : "";
      },
      imagen: function () {
        if (imagen && !TIPOS_IMAGEN[imagen.type]) return "La imagen debe ser JPG, PNG o WebP.";
        if (imagen && imagen.size > maxBytes) return "La imagen pesa " + mb(imagen.size) + ". El máximo es " + (cfg.maxImagenMB || 10) + " MB.";
        return tipo() === "diseno_propio" && !imagen ? "Sube la imagen de tu diseño." : "";
      },
      nombre: function () { return $("#nombre").value.trim().length >= 2 ? "" : "Escribe tu nombre."; },
      email: function () {
        var v = $("#email").value.trim();
        if (!v) return "Escribe tu email para poder enviarte el presupuesto.";
        return EMAIL_RE.test(v) ? "" : "Revisa el email: parece incompleto (ej.: nombre@correo.com).";
      },
      telefono: function () {
        var v = $("#telefono").value.trim();
        return !v || /^[+\d][\d\s().-]{6,24}$/.test(v) ? "" : "Revisa el teléfono o déjalo vacío.";
      },
      privacidad: function () { return $("#privacidad").checked ? "" : "Para enviar la solicitud debes aceptar la política de privacidad."; }
    };
    // Campo que recibe el foco y aria-invalid para cada regla
    var objetivo = {
      tipo: function () { return form.querySelector('input[name="tipo"]'); },
      modelo: function () { return selectModelo; },
      forma: function () { return form.querySelector('input[name="forma"]'); },
      ancho: function () { return $("#ancho"); }, largo: function () { return $("#largo"); },
      desc: function () { return $("#descripcion"); }, imagen: function () { return $("#imagen"); },
      nombre: function () { return $("#nombre"); }, email: function () { return $("#email"); },
      telefono: function () { return $("#telefono"); }, privacidad: function () { return $("#privacidad"); }
    };

    function validar(clave) {
      var msg = reglas[clave]();
      var nodo = objetivo[clave]();
      var err = form.querySelector("#e-" + clave);
      if (err) err.textContent = msg;
      if (nodo && nodo.type !== "radio") nodo.setAttribute("aria-invalid", msg ? "true" : "false");
      return msg;
    }

    function validarTodo() {
      var errores = [];
      Object.keys(reglas).forEach(function (k) { var m = validar(k); if (m) errores.push({ clave: k, msg: m }); });
      var resumen = form.querySelector("[data-resumen]");
      resumen.textContent = "";
      if (errores.length) {
        resumen.appendChild(el("h2", { texto: errores.length === 1 ? "Falta corregir 1 cosa:" : "Faltan por corregir " + errores.length + " cosas:" }));
        var ul = el("ul");
        errores.forEach(function (e) {
          var destino = objetivo[e.clave]();
          var a = el("a", { href: "#" + destino.id, texto: e.msg });
          a.addEventListener("click", function (ev) { ev.preventDefault(); destino.focus(); });
          ul.appendChild(el("li", {}, [a]));
        });
        resumen.appendChild(ul);
        resumen.focus();
      }
      return errores.length === 0;
    }

    // Revalidar en vivo solo después del primer intento de envío (o al salir de un campo con contenido)
    form.addEventListener("change", function (e) {
      if (e.target.name === "tipo" || e.target.name === "forma") actualizarVisibilidad();
      if (intentado) Object.keys(reglas).forEach(validar);
    });
    form.addEventListener("focusout", function (e) {
      var id = e.target.id;
      var mapa = { ancho: "ancho", largo: "largo", nombre: "nombre", email: "email", telefono: "telefono", descripcion: "desc" };
      if (mapa[id] && (intentado || e.target.value.trim())) validar(mapa[id]);
    });

    // Imagen con vista previa -------------------------------------------
    var input = $("#imagen");
    var zona = form.querySelector("[data-subida]");
    var previa = form.querySelector("[data-vista-previa]");
    var urlPrevia = null;

    function mb(bytes) {
      if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
      return (bytes / 1024 / 1024).toLocaleString("es-ES", { maximumFractionDigits: 1 }) + " MB";
    }

    function ponerImagen(file) {
      imagen = file || null;
      if (urlPrevia) { URL.revokeObjectURL(urlPrevia); urlPrevia = null; }
      var msg = validar("imagen");
      if (imagen && !msg) {
        urlPrevia = URL.createObjectURL(imagen);
        previa.querySelector("[data-previa-img]").src = urlPrevia;
        previa.querySelector("[data-previa-nombre]").textContent = imagen.name;
        previa.querySelector("[data-previa-peso]").textContent = mb(imagen.size);
        previa.hidden = false;
        zona.hidden = true;
      } else {
        if (msg && imagen) imagen = null;
        input.value = "";
        previa.hidden = true;
        zona.hidden = false;
      }
    }
    input.addEventListener("change", function () { ponerImagen(input.files[0]); });
    form.querySelector("[data-quitar-imagen]").addEventListener("click", function () {
      ponerImagen(null);
      form.querySelector("#e-imagen").textContent = "";
      input.focus();
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("arrastrando"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zona.addEventListener(ev, function () { zona.classList.remove("arrastrando"); });
    });
    zona.addEventListener("drop", function (e) {
      e.preventDefault();
      if (e.dataTransfer.files.length) ponerImagen(e.dataTransfer.files[0]);
    });

    // Envío --------------------------------------------------------------
    var boton = form.querySelector("[data-enviar]");
    var aviso = form.querySelector("[data-aviso]");

    function estadoEnvio(activo, texto) {
      enviando = activo;
      boton.disabled = activo;
      boton.querySelector("[data-enviar-texto]").textContent = texto;
      var g = boton.querySelector(".girador");
      if (activo && !g) boton.appendChild(el("span", { clase: "girador", "aria-hidden": "true" }));
      if (!activo && g) g.remove();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (enviando) return;
      intentado = true;
      aviso.textContent = "";
      if (!validarTodo()) return;

      // Honeypot: un humano no ve este campo. Si viene relleno, fingimos éxito.
      if ($("#web").value) { location.href = ruta("gracias.html"); return; }

      var redonda = forma() === "redonda";
      var ancho = entero($("#ancho").value);
      var id = nuevoId();
      var datos = {
        id: id,
        nombre: $("#nombre").value.trim(),
        email: $("#email").value.trim(),
        telefono: $("#telefono").value.trim() || null,
        tipo: tipo(),
        modelo_ref: tipo() === "catalogo" ? selectModelo.value || null : null,
        ancho_cm: ancho,
        largo_cm: redonda ? ancho : entero($("#largo").value),
        forma: forma(),
        colores: $("#colores").value.trim() || null,
        estancia: $("#estancia").value || null,
        descripcion: $("#descripcion").value.trim() || null,
        imagen_path: null,
        acepta_privacidad: true,
        privacidad_version: cfg.privacidadVersion || "1"
      };

      estadoEnvio(true, imagen ? "Subiendo imagen…" : "Enviando…");
      var subida = imagen
        ? subirImagen(cfg, id, imagen).then(function (ruta) { datos.imagen_path = ruta; })
        : Promise.resolve();

      subida
        .then(function () { estadoEnvio(true, "Enviando…"); return insertarSolicitud(cfg, datos); })
        .then(function () { location.href = ruta("gracias.html"); })
        .catch(function (err) {
          if (window.console) console.error("Error al enviar la solicitud:", err);
          estadoEnvio(false, "Enviar solicitud");
          aviso.textContent = "No hemos podido enviar tu solicitud. Comprueba tu conexión e inténtalo de nuevo. Si sigue fallando, escríbenos a lsd1091@gmail.com.";
          aviso.focus();
        });
    });
  }

  function nuevoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }

  // Llamadas directas a la API de Supabase con la clave publicable (sin librería).
  function cabeceras(cfg, extra) {
    var h = { apikey: cfg.supabaseKey };
    Object.keys(extra || {}).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }

  function subirImagen(cfg, id, file) {
    var ruta = id + "/diseno." + TIPOS_IMAGEN[file.type];
    var url = cfg.supabaseUrl + "/storage/v1/object/" + cfg.bucketImagenes + "/" + ruta;
    return fetch(url, {
      method: "POST",
      headers: cabeceras(cfg, { "Content-Type": file.type, "x-upsert": "false", "cache-control": "3600" }),
      body: file
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("Storage " + r.status + ": " + t); });
      return ruta;
    });
  }

  function insertarSolicitud(cfg, datos) {
    return fetch(cfg.supabaseUrl + "/rest/v1/solicitudes", {
      method: "POST",
      headers: cabeceras(cfg, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify(datos)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (t) { throw new Error("REST " + r.status + ": " + t); });
    });
  }

  /* Año en el pie ------------------------------------------------------ */
  function iniciarAnio() {
    document.querySelectorAll("[data-anio]").forEach(function (n) { n.textContent = new Date().getFullYear(); });
    var plazo = (window.TRUFING_CONFIG || {}).plazoRespuesta;
    if (plazo) document.querySelectorAll("[data-plazo]").forEach(function (n) { n.textContent = plazo; });
  }

  document.addEventListener("DOMContentLoaded", function () {
    iniciarCabecera();
    iniciarAnio();
    iniciarDestacadas();
    iniciarCatalogo();
    iniciarFicha();
    iniciarFormulario();
    revelar();
  });

  // Expuesto para depuración y para las fases 2-3.
  window.Trufing = { cargarCatalogo: cargarCatalogo, ruta: ruta };
})();
