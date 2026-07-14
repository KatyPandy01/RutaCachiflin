
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Caché local temporal sincronizada con Firestore para pintar la UI
const state = {
  rutas: [],
  incidentes: [],
  reclamos: [],
  contratos: [],
  userRole: 'consulta' // Rol por defecto
};

let unsubscribers = [];

// ============================================================================
// AUTENTICACIÃ“N Y ROLES (Fase 2 + RBAC)
// ============================================================================

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  const submitBtn = document.getElementById('login-submit-btn');

  errorDiv.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Iniciando sesión...';

  const auth = window.firebaseAuth;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Error de autenticación:", error);
    const mensajes = {
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/invalid-email': 'El correo ingresado no es válido.',
      'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
      'auth/user-not-found': 'No existe una cuenta con este correo.',
      'auth/wrong-password': 'La contraseña es incorrecta.',
      'auth/too-many-requests': 'Demasiados intentos fallidos. Intenta más tarde.',
      'auth/network-request-failed': 'Error de conexión.'
    };
    errorDiv.textContent = mensajes[error.code] || 'Error al iniciar sesión.';
    errorDiv.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Iniciar Sesión';
  }
}

async function handleLogout() {
  const auth = window.firebaseAuth;
  if (!auth) return;
  try {
    unsubscribers.forEach(unsub => unsub());
    unsubscribers = [];
    state.rutas = [];
    state.incidentes = [];
    state.reclamos = [];
    state.contratos = [];
    state.userRole = 'consulta';
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

function showApp(user, role) {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-sidebar').style.display = '';
  document.getElementById('app-main').style.display = '';

  const sidebarUser = document.getElementById('sidebar-user');
  if (sidebarUser) {
    sidebarUser.innerHTML = `<i class="fa-solid fa-circle-user"></i> ${user.email} <span style="font-size:10px;display:block;color:var(--color-secondary);font-weight:600;text-transform:uppercase;">${role.replace('_', ' ')}</span>`;
  }

  // Ocultar/Mostrar opciones del menú segÃºn rol
  applyMenuPermissions(role);

  setupRealtimeListeners();
}

function applyMenuPermissions(role) {
  // Opciones de menú por defecto visibles
  document.getElementById('btn-nav-dashboard').style.display = '';
  document.getElementById('btn-nav-rutas').style.display = 'none';
  document.getElementById('btn-nav-incidentes').style.display = 'none';
  document.getElementById('btn-nav-reclamos').style.display = 'none';
  document.getElementById('btn-nav-contratos').style.display = 'none';

  // Configuración de visibilidad de menús por rol
  if (role === 'coordinador_servicio') {
    document.getElementById('btn-nav-reclamos').style.display = '';
    // coordinador_servicio: solo Dashboard y Reclamos (sin Rutas, Incidentes ni Contratos)
  } else if (role === 'director_general') {
    document.getElementById('btn-nav-contratos').style.display = '';
    document.getElementById('btn-nav-incidentes').style.display = '';
    document.getElementById('btn-nav-reclamos').style.display = '';
  } else if (role === 'operario_trafico') {
    document.getElementById('btn-nav-rutas').style.display = '';
    document.getElementById('btn-nav-incidentes').style.display = '';
  } else if (role === 'jefe_trafico') {
    document.getElementById('btn-nav-rutas').style.display = '';
    document.getElementById('btn-nav-incidentes').style.display = '';
    document.getElementById('btn-nav-reclamos').style.display = '';
  } else if (role === 'agente_servicio') {
    document.getElementById('btn-nav-reclamos').style.display = '';
  } else if (role === 'director_financiero') {
    document.getElementById('btn-nav-contratos').style.display = '';
    document.getElementById('btn-nav-reclamos').style.display = '';
  } else {
    // Modo consulta genérico: ve todo en solo lectura
    document.getElementById('btn-nav-rutas').style.display = '';
    document.getElementById('btn-nav-incidentes').style.display = '';
    document.getElementById('btn-nav-reclamos').style.display = '';
    document.getElementById('btn-nav-contratos').style.display = '';
  }
}

function showLogin() {
  document.getElementById('login-screen').style.display = '';
  document.getElementById('app-sidebar').style.display = 'none';
  document.getElementById('app-main').style.display = 'none';
}

// ============================================================================
// LISTENERS EN TIEMPO REAL (onSnapshot)
// ============================================================================

function setupRealtimeListeners() {
  const db = window.db;
  if (!db) return;

  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];

  // Rutas
  unsubscribers.push(
    onSnapshot(collection(db, "rutas"), (snapshot) => {
      state.rutas = [];
      snapshot.forEach(d => { state.rutas.push({ id: d.id, ...d.data() }); });
      renderAll();
    })
  );

  // Incidentes
  unsubscribers.push(
    onSnapshot(collection(db, "incidentes"), (snapshot) => {
      state.incidentes = [];
      snapshot.forEach(d => { state.incidentes.push({ id: d.id, ...d.data() }); });
      renderAll();
    })
  );

  // Reclamos
  unsubscribers.push(
    onSnapshot(collection(db, "reclamos"), (snapshot) => {
      state.reclamos = [];
      snapshot.forEach(d => { state.reclamos.push({ id: d.id, ...d.data() }); });
      renderAll();
    })
  );

  // Contratos
  unsubscribers.push(
    onSnapshot(collection(db, "contratos"), (snapshot) => {
      state.contratos = [];
      snapshot.forEach(d => { state.contratos.push({ id: d.id, ...d.data() }); });
      renderAll();
    })
  );
}

// ============================================================================
// RENDERIZADO Y LÃ“GICA DE INTERFAZ
// ============================================================================

function showPanel(id, titleText) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const targetPanel = document.getElementById('panel-' + id);
  if (targetPanel) targetPanel.classList.add('active');

  const btn = document.getElementById('btn-nav-' + id);
  if (btn) btn.classList.add('active');
  
  if (titleText) {
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titleText;
  }
  renderAll();
}

function estadoBadge(e) {
  const map = {
    'en ruta': 'info',
    'entregado': 'success',
    'pendiente': 'warning',
    'abierto': 'gray',
    'validado': 'info',
    'en revisión': 'warning',
    'resuelto': 'success',
    'activo': 'success',
    'aprobado_dg': 'success',
    'pendiente_aprobacion': 'warning'
  };
  return `<span class="badge badge-${map[e] || 'gray'}">${e}</span>`;
}

function renderDashboard() {
  // Filtrar reclamos segÃºn rol para la vista del dashboard
  const claimsFiltered = (state.userRole === 'jefe_trafico' || state.userRole === 'director_financiero')
    ? state.reclamos.filter(r => r.estado !== 'abierto')
    : state.reclamos;

  document.getElementById('d-rutas').textContent = state.rutas.filter(r => r.estado === 'en ruta').length;
  document.getElementById('d-incidentes').textContent = state.incidentes.filter(i => i.estado === 'pendiente').length;
  document.getElementById('d-reclamos').textContent = claimsFiltered.filter(r => r.estado !== 'resuelto').length;

  document.getElementById('dashboard-rutas').innerHTML = state.rutas.map(r => `
    <div class="row-item rounded">
      <div>
        <div class="row-title">${r.conductor} · ${r.unidad}</div>
        <div class="row-sub">${r.destino} · ${r.cliente}</div>
      </div>
      ${estadoBadge(r.estado)}
    </div>`).join('');

  // Alertas generales
  const alertas = [];
  state.incidentes.filter(i => i.estado === 'pendiente').forEach(i => {
    alertas.push(`<div class="alert-box alert-warning"><i class="fa-solid fa-triangle-exclamation"></i> Incidente pendiente de validación - ${i.conductor} · ${i.tipo} en ${i.ubicacion}</div>`);
  });
  claimsFiltered.filter(r => r.estado === 'abierto').forEach(r => {
    alertas.push(`<div class="alert-box alert-warning"><i class="fa-regular fa-envelope"></i> Reclamo abierto - ${r.cliente} · ${r.tipo}</div>`);
  });
  if (!alertas.length) alertas.push(`<div class="alert-box alert-success"><i class="fa-solid fa-circle-check"></i> Sin alertas activas - el sistema opera con normalidad</div>`);
  document.getElementById('dashboard-alertas').innerHTML = alertas.join('');

  // Dashboard especial de reclamos recurrentes para director_general y director_financiero
  const recCard = document.getElementById('dashboard-recurrentes-card');
  if (state.userRole === 'director_general' || state.userRole === 'director_financiero') {
    recCard.style.display = 'block';
    
    // Buscar reclamos recurrentes
    const recurrentes = state.reclamos.filter(r => r.recurrente === 'Sí');
    if (recurrentes.length > 0) {
      // Calcular costes acumulados por tipo (sólo director_general ve costes acumulados detallados)
      const costMap = {};
      recurrentes.forEach(r => {
        costMap[r.tipo] = (costMap[r.tipo] || 0) + (Number(r.monto) || 0);
      });

      let contentHtml = `<div style="display:flex; flex-direction:column; gap:10px;">`;
      recurrentes.forEach(r => {
        contentHtml += `
          <div class="alert-box alert-danger" style="margin-bottom:0;">
            <i class="fa-solid fa-circle-exclamation"></i> 
            <strong>RECLAMO RECURRENTE:</strong> ${r.cliente} · ${r.tipo} (Pedido: ${r.pedido})
          </div>`;
      });

      if (state.userRole === 'director_general') {
        contentHtml += `<div style="margin-top:12px; border-top:1px solid var(--color-border-primary); padding-top:10px;">
          <h4 style="font-size:14px;margin-bottom:6px;color:var(--color-primary);">Costo Total Acumulado por Tipo de Reclamo Recurrente:</h4>`;
        for (const [tipo, total] of Object.entries(costMap)) {
          contentHtml += `<div style="font-size:13px; font-weight:600; color:var(--color-danger); margin-bottom:4px;">
            <i class="fa-solid fa-wallet"></i> ${tipo}: <span style="font-size:15px;color:var(--color-text-primary);">L. ${total.toLocaleString()}</span>
          </div>`;
        }
        contentHtml += `</div>`;
      }
      contentHtml += `</div>`;
      document.getElementById('dashboard-recurrentes-content').innerHTML = contentHtml;
    } else {
      document.getElementById('dashboard-recurrentes-content').innerHTML = `<div style="font-size:13px;color:var(--color-text-tertiary);text-align:center;">No hay reclamos recurrentes activos</div>`;
    }
  } else {
    recCard.style.display = 'none';
  }
}

// CASO EMERSON: llena el datalist de "rc-pedido" con los pedidos que
// realmente existen en Rutas, para que Reclamos no acepte pedidos inventados.
function actualizarDatalistPedidos() {
  const dl = document.getElementById('pedidos-activos-list');
  if (!dl) return;
  const pedidos = [...new Set(state.rutas.map(r => r.cliente).filter(Boolean))];
  dl.innerHTML = pedidos.map(p => `<option value="${p}">`).join('');
}

function renderRutas() {
  const panel = document.getElementById('panel-rutas');
  if (!panel) return;
  // Ocultar formulario de registro de rutas a quienes no son operario_trafico
  const formCard = panel.querySelector('.card');
  if (state.userRole === 'operario_trafico') {
    formCard.style.display = '';
  } else {
    formCard.style.display = 'none';
  }

  document.getElementById('lista-rutas').innerHTML = state.rutas.map(r => {
    // Calcular minutos transcurridos desde la creación
    const minutos = r.creadoEn ? Math.floor((Date.now() - new Date(r.creadoEn).getTime()) / 60000) : (r.minutos || 0);
    const pct = r.estado === 'entregado' ? 100 : Math.min(100, Math.round((minutos / 40) * 100));
    const color = pct >= 80 ? 'var(--color-danger)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-success)';
    const restante = Math.max(0, 40 - minutos);
    return `<div class="row-item rounded">
      <div style="flex:1">
        <div class="row-title">${r.conductor} · ${r.unidad}</div>
        <div class="row-sub">${r.horario} -> ${r.destino} · ${r.cliente}</div>
        ${r.estado === 'en ruta' ? `
          <div class="timer-bar"><div class="timer-fill" style="width:${pct}%;background:${color}"></div></div>
          <div style="font-size:12px;font-weight:500;color:var(--color-text-tertiary);margin-top:4px">${restante > 0 ? `Próxima actualización en ${restante} min` : '<span style="color:var(--color-danger);font-weight:600;">⚠ Tiempo de actualización excedido</span>'}</div>
        ` : ''}
      </div>
      <div style="margin-left:16px">${estadoBadge(r.estado)}</div>
    </div>`;
  }).join('');

  // CASO EMERSON: mantener el datalist de pedidos sincronizado con Rutas
  actualizarDatalistPedidos();
}

function renderIncidentes() {
  const panel = document.getElementById('panel-incidentes');
  if (!panel) return;

  const formCard = panel.querySelector('.card');
  if (state.userRole === 'operario_trafico') {
    formCard.style.display = '';
  } else {
    formCard.style.display = 'none';
  }

  // Poblado de rutas activas y control de visualización del formulario
  const rutasActivas = state.rutas.filter(r => r.estado === 'en ruta');
  const noRutasMsg = document.getElementById('no-rutas-msg');
  const formFields = document.getElementById('incidente-form-fields');
  const selectEl = document.getElementById('i-ruta-activa-select');

  if (rutasActivas.length === 0) {
    if (noRutasMsg) noRutasMsg.style.display = 'block';
    if (formFields) formFields.style.display = 'none';
  } else {
    if (noRutasMsg) noRutasMsg.style.display = 'none';
    if (formFields) formFields.style.display = '';

    if (selectEl) {
      const prevVal = selectEl.value;
      selectEl.innerHTML = rutasActivas.map(r => `
        <option value="${r.id}">${r.conductor} · ${r.unidad} · ${r.destino}</option>
      `).join('');

      if (prevVal && rutasActivas.some(r => r.id === prevVal)) {
        selectEl.value = prevVal;
      } else {
        selectEl.selectedIndex = 0;
      }
      actualizarCamposRutaActiva();
    }
  }

  document.getElementById('lista-incidentes').innerHTML = state.incidentes.length ? state.incidentes.map(i => {
    // Calcular minutos transcurridos desde la creación
    const minutos = i.creadoEn ? Math.floor((Date.now() - new Date(i.creadoEn).getTime()) / 60000) : (i.minutos || 0);
    const pct = Math.min(100, Math.round((minutos / 15) * 100));
    const color = pct >= 80 ? 'var(--color-danger)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-success)';
    
    // Acción correctiva de DG
    let actionsHtml = '';
    if (i.estado === 'pendiente' && state.userRole === 'jefe_trafico') {
      actionsHtml = `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px" onclick="validarIncidente('${i.id}')">Validar</button>`;
    } else if (i.estado === 'validado' && state.userRole === 'director_general') {
      actionsHtml = `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px;background-color:var(--color-success);" onclick="aprobarAccionDG('${i.id}')">Aprobar Acción Correctiva</button>`;
    }

    return `<div class="row-item rounded" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div class="row-title">${i.tipo} · ${i.conductor}</div>
          <div class="row-sub">${i.ubicacion} · Cliente: ${i.cliente}</div>
        </div>
        <div>${estadoBadge(i.estado)}</div>
      </div>
      <div style="margin-top:8px; font-size:13px; color:var(--color-text-secondary); background:rgba(0,0,0,0.02); padding:8px; border-radius:6px;">
        <strong>Descripción:</strong> ${i.descripcion || 'Sin descripción'}<br/>
        <strong>Acción correctiva propuesta:</strong> ${i.accion || 'Pendiente de registrar'}
      </div>
      ${i.estado === 'pendiente' ? `
        <div class="timer-bar"><div class="timer-fill" style="width:${pct}%;background:${color}"></div></div>
      ` : ''}
      <div style="margin-top:8px; display:flex; justify-content:flex-end;">
        ${actionsHtml}
      </div>
    </div>`;
  }).join('') : '<div style="font-size:14px;color:var(--color-text-tertiary);padding:1rem;text-align:center;">Sin incidentes registrados</div>';
}

function renderReclamos() {
  const panel = document.getElementById('panel-reclamos');
  if (!panel) return;

  const formCard = panel.querySelector('.card');
  if (state.userRole === 'agente_servicio') {
    formCard.style.display = '';
  } else {
    formCard.style.display = 'none';
  }

  // Filtrar reclamos no validados para jefe_trafico y director_financiero
  const listFiltered = (state.userRole === 'jefe_trafico' || state.userRole === 'director_financiero')
    ? state.reclamos.filter(r => r.estado !== 'abierto')
    : state.reclamos;

  document.getElementById('lista-reclamos').innerHTML = listFiltered.map(r => {
    let actionFormHtml = '';

    if (r.estado === 'abierto' && state.userRole === 'coordinador_servicio') {
      actionFormHtml = `
        <div style="margin-top:8px; display:flex; justify-content:flex-end;">
          <button class="btn btn-primary" onclick="validarReclamo('${r.id}')"><i class="fa-solid fa-check"></i> Validar Reclamo</button>
        </div>`;
    } else if (r.estado === 'validado' && state.userRole === 'jefe_trafico') {
      actionFormHtml = `
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
          <label style="margin-bottom:0;">Registrar acción correctiva para revisión:</label>
          <div style="display:flex; gap:8px;">
            <input type="text" id="action-input-${r.id}" placeholder="Acción correctiva" style="margin-bottom:0; flex:1;" />
            <button class="btn btn-primary" onclick="revisarReclamo('${r.id}')">Enviar a Revisión</button>
          </div>
        </div>`;
    } else if (r.estado === 'en revisión' && state.userRole === 'director_financiero') {
      actionFormHtml = `
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px; background:rgba(249,115,22,0.05); padding:10px; border-radius:8px; border:1px dashed var(--color-secondary);">
          <div class="grid2" style="margin-bottom:0;">
            <div>
              <label>¿Genera compensación?</label>
              <select id="comp-input-${r.id}" style="margin-bottom:0;">
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
            </div>
            <div>
              <label>Monto compensación (L.)</label>
              <input type="number" id="monto-input-${r.id}" placeholder="0.00" style="margin-bottom:0;" />
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; margin-top:8px;">
            <button class="btn btn-primary" onclick="resolverReclamo('${r.id}')">Resolver y Cerrar Reclamo</button>
          </div>
        </div>`;
    }

    return `
      <div class="row-item rounded" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="row-title">${r.cliente} · Pedido: ${r.pedido}</div>
            <div class="row-sub">${r.tipo} · Conductor: ${r.conductor}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${r.recurrente === 'Sí' ? '<span class="badge badge-danger" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;"><i class="fa-solid fa-circle-exclamation"></i> Recurrente</span>' : ''}
            ${estadoBadge(r.estado)}
          </div>
        </div>
        <div style="margin-top:8px; font-size:13px; color:var(--color-text-secondary); background:rgba(0,0,0,0.02); padding:8px; border-radius:6px;">
          <strong>Descripción:</strong> ${r.descripcion || 'Sin descripción'}<br/>
          <strong>Acción correctiva:</strong> ${r.accion || 'Pendiente'}<br/>
          <strong>Compensación:</strong> ${r.compensacion || 'Pendiente'} ${r.monto ? `(L. ${Number(r.monto).toLocaleString()})` : ''}
        </div>
        ${actionFormHtml}
      </div>`;
  }).join('');
}

function renderContratos() {
  const panel = document.getElementById('panel-contratos');
  if (!panel) return;

  // Solo el director_financiero puede registrar contratos
  const formCard = panel.querySelector('.card');
  if (state.userRole === 'director_financiero') {
    formCard.style.display = '';
  } else {
    formCard.style.display = 'none';
  }

  // Mientras esté pendiente, solo director_financiero y director_general pueden verlo.
  // Cuando esté activo es visible para todos.
  const contratosFiltrados = state.contratos.filter(c => {
    const estado = c.estado || 'pendiente_aprobacion';
    if (estado === 'activo') return true;
    return (state.userRole === 'director_financiero' || state.userRole === 'director_general');
  });

  document.getElementById('lista-contratos').innerHTML = contratosFiltrados.map(c => {
    let actionBtnHtml = '';
    // director_general aprueba -> estado pasa a activo.
    const estado = c.estado || 'pendiente_aprobacion';
    if (estado === 'pendiente_aprobacion' && state.userRole === 'director_general') {
      actionBtnHtml = `<button class="btn btn-primary" style="font-size:12px;padding:6px 12px;background-color:var(--color-success);" onclick="aprobarContrato('${c.id}')">Aprobar Contrato</button>`;
    }

    return `
      <div class="row-item rounded" style="flex-direction:column; align-items:stretch;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="row-title">${c.nombre}</div>
          <div>${estadoBadge(estado)}</div>
        </div>
        <div class="row-sub" style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">
          <span class="contract-tag">${c.prioridad}</span>
          <span class="contract-tag">${c.condiciones}</span>
          <span class="contract-tag">Tarifa: L. ${c.tarifa}</span>
          <span class="contract-tag" style="color:var(--color-danger);border-color:#fecaca">Penalización: L. ${c.penalizacion}</span>
        </div>
        ${actionBtnHtml ? `<div style="margin-top:8px; display:flex; justify-content:flex-end;">${actionBtnHtml}</div>` : ''}
      </div>`;
  }).join('');
}

function renderAll() {
  renderDashboard();
  renderRutas();
  renderIncidentes();
  renderReclamos();
  renderContratos();
}

// ============================================================================
// OPERACIONES DE ESCRITURA EN FIRESTORE (Flujo en Cascada / RACI)
// ============================================================================

async function registrarRuta() {
  const db = window.db;
  if (!db) return;
  const conductor = document.getElementById('r-conductor').value;
  const unidad = document.getElementById('r-unidad').value;
  const horario = document.getElementById('r-horario').value;
  const destinoEl = document.getElementById('r-destino');
  const clienteEl = document.getElementById('r-cliente');

  // CASO EMERSON: valida obligatoriedad y formato (PED-#####-L##) antes de
  // guardar; antes se guardaba "Sin especificar" en silencio.
  if (!destinoEl.reportValidity() || !clienteEl.reportValidity()) return;

  const destino = destinoEl.value;
  const cliente = clienteEl.value;

  try {
    await addDoc(collection(db, "rutas"), {
      conductor,
      unidad,
      horario,
      destino,
      cliente,
      estado: 'en ruta',
      minutos: 0,
      creadoEn: new Date().toISOString()
    });
    document.getElementById('r-destino').value = '';
    document.getElementById('r-cliente').value = '';
  } catch (error) {
    console.error("Error al registrar ruta:", error);
  }
}

async function registrarIncidente() {
  const db = window.db;
  if (!db) return;

  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el ? el.value : fallback;
  };

  const conductor = getVal('i-conductor');
  const unidad = getVal('i-unidad');
  const tipo = getVal('i-tipo');
  const ubicacion = getVal('i-ubicacion') || 'Sin especificar';
  const descripcion = getVal('i-descripcion');
  const accion = getVal('i-accion');
  const cliente = getVal('i-cliente') || 'Sin especificar';
  const horaEstimada = getVal('i-hora');
  const estadoEntrega = getVal('i-estado');
  const notificado = getVal('i-notificado');

  try {
    await addDoc(collection(db, "incidentes"), {
      conductor,
      unidad,
      tipo,
      ubicacion,
      descripcion,
      accion,
      cliente,
      horaEstimada,
      estadoEntrega,
      notificado,
      estado: 'pendiente',
      minutos: 0,
      creadoEn: new Date().toISOString()
    });
    // Limpiar campos del formulario
    ['i-ubicacion', 'i-descripcion', 'i-accion', 'i-hora'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch (error) {
    console.error("Error al registrar incidente:", error);
    alert('Error al registrar el incidente: ' + error.message);
  }
}

function reportarIncidente() {
  registrarIncidente();
}

async function validarIncidente(id) {
  const db = window.db;
  if (!db) return;
  try {
    const docRef = doc(db, "incidentes", id);
    await updateDoc(docRef, { estado: 'validado' });
    alert('Incidente validado correctamente.');
  } catch (error) {
    console.error("Error al validar incidente:", error);
    alert('Error al validar el incidente: ' + error.message);
  }
}

async function aprobarAccionDG(id) {
  const db = window.db;
  if (!db) return;
  try {
    const docRef = doc(db, "incidentes", id);
    await updateDoc(docRef, { estado: 'aprobado_dg' });
    alert('Acción correctiva aprobada exitosamente.');
  } catch (error) {
    console.error("Error al aprobar acción correctiva del incidente:", error);
    alert('Error al aprobar la acción correctiva: ' + error.message);
  }
}

async function registrarReclamo() {
  const db = window.db;
  if (!db) return;

  const getVal = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : '';
  };

  const clienteEl = document.getElementById('rc-cliente');
  const pedidoEl = document.getElementById('rc-pedido');

  // CASO EMERSON: valida obligatoriedad y formato (mismo estándar que
  // Rutas) antes de guardar; antes se guardaba "Cliente"/"PED-000".
  if (!clienteEl.reportValidity() || !pedidoEl.reportValidity()) return;

  const cliente = clienteEl.value;
  const pedido = pedidoEl.value;
  const tipo = getVal('rc-tipo');
  const descripcion = getVal('rc-descripcion') || '';
  const conductor = getVal('rc-conductor');
  const ruta = getVal('rc-ruta') || '';
  const causa = getVal('rc-causa') || '';
  const recurrente = getVal('rc-recurrente') || 'No';
  const accion = getVal('rc-accion') || '';
  const compensacion = getVal('rc-comp') || '';
  const monto = Number(getVal('rc-monto')) || 0;
  const contrato = getVal('rc-contrato') || '';

  try {
    await addDoc(collection(db, "reclamos"), {
      cliente,
      pedido,
      tipo,
      descripcion,
      conductor,
      ruta,
      causa,
      recurrente,
      accion,
      compensacion,
      monto,
      contrato,
      estado: 'abierto'
    });

    // Limpiar campos del formulario que existen en la interfaz
    const fieldsToReset = ['rc-cliente', 'rc-pedido', 'rc-descripcion', 'rc-ruta', 'rc-causa'];
    fieldsToReset.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch (error) {
    console.error("Error al registrar reclamo:", error);
  }
}

// coordinador_servicio valida reclamo
async function validarReclamo(id) {
  const db = window.db;
  if (!db) return;
  try {
    const docRef = doc(db, "reclamos", id);
    await updateDoc(docRef, { estado: 'validado' });
    alert('Reclamo validado correctamente.');
  } catch (error) {
    console.error("Error al validar reclamo:", error);
    alert('Error al validar el reclamo: ' + error.message);
  }
}

// jefe_trafico registra acción correctiva y marca en revisión
async function revisarReclamo(id) {
  const db = window.db;
  if (!db) return;
  const input = document.getElementById(`action-input-${id}`);
  if (!input || !input.value.trim()) {
    alert("Por favor escribe la acción correctiva.");
    return;
  }
  try {
    const docRef = doc(db, "reclamos", id);
    await updateDoc(docRef, { 
      accion: input.value,
      estado: 'en revisión'
    });
  } catch (error) {
    console.error("Error al revisar reclamo:", error);
  }
}

// director_financiero resuelve
async function resolverReclamo(id) {
  const db = window.db;
  if (!db) return;
  const compSelect = document.getElementById(`comp-input-${id}`);
  const montoInput = document.getElementById(`monto-input-${id}`);
  if (!compSelect || !montoInput) return;

  try {
    const docRef = doc(db, "reclamos", id);
    await updateDoc(docRef, { 
      compensacion: compSelect.value,
      monto: Number(montoInput.value) || 0,
      estado: 'resuelto'
    });
  } catch (error) {
    console.error("Error al resolver reclamo:", error);
  }
}

async function registrarContrato() {
  const db = window.db;
  if (!db) return;
  const nombreEl = document.getElementById('c-nombre');

  // CASO EMERSON: valida obligatoriedad antes de guardar; antes se
  // guardaba "Cliente nuevo" en silencio.
  if (!nombreEl.reportValidity()) return;

  const nombre = nombreEl.value;
  const prioridad = document.getElementById('c-prioridad').value;
  const condiciones = document.getElementById('c-condiciones').value || 'Sin condiciones especiales';
  const tarifa = Number(document.getElementById('c-tarifa').value) || 0;
  const penalizacion = Number(document.getElementById('c-penalizacion').value) || 0;

  try {
    await addDoc(collection(db, "contratos"), {
      nombre,
      prioridad,
      condiciones,
      tarifa: tarifa.toLocaleString(),
      penalizacion: penalizacion.toLocaleString(),
      estado: 'pendiente_aprobacion' // Por defecto inicia pendiente de aprobación
    });
    document.getElementById('c-nombre').value = '';
    document.getElementById('c-condiciones').value = '';
    document.getElementById('c-tarifa').value = '';
    document.getElementById('c-penalizacion').value = '';
  } catch (error) {
    console.error("Error al registrar contrato:", error);
  }
}

async function aprobarContrato(id) {
  const db = window.db;
  if (!db) return;
  try {
    const docRef = doc(db, "contratos", id);
    await updateDoc(docRef, { estado: 'activo' });
    alert('Contrato aprobado correctamente.');
  } catch (error) {
    console.error("Error al aprobar contrato:", error);
    alert('Error al aprobar el contrato: ' + error.message);
  }
}

function actualizarCamposRutaActiva() {
  const selectEl = document.getElementById('i-ruta-activa-select');
  if (!selectEl) return;
  const rutaId = selectEl.value;
  const ruta = state.rutas.find(r => r.id === rutaId);

  const conductorEl = document.getElementById('i-conductor');
  const unidadEl = document.getElementById('i-unidad');
  const clienteEl = document.getElementById('i-cliente');

  if (ruta) {
    if (conductorEl) conductorEl.value = ruta.conductor || '';
    if (unidadEl) unidadEl.value = ruta.unidad || '';
    if (clienteEl) clienteEl.value = ruta.cliente || '';
  } else {
    if (conductorEl) conductorEl.value = '';
    if (unidadEl) unidadEl.value = '';
    if (clienteEl) clienteEl.value = '';
  }
}

// Exponer funciones globales a window para onclick inline
window.actualizarCamposRutaActiva = actualizarCamposRutaActiva;
window.showPanel = showPanel;
window.estadoBadge = estadoBadge;
window.renderDashboard = renderDashboard;
window.renderRutas = renderRutas;
window.renderIncidentes = renderIncidentes;
window.renderReclamos = renderReclamos;
window.renderContratos = renderContratos;
window.renderAll = renderAll;
window.registrarRuta = registrarRuta;
window.registrarIncidente = registrarIncidente;
window.reportarIncidente = reportarIncidente;
window.validarIncidente = validarIncidente;
window.aprobarAccionDG = aprobarAccionDG;
window.registrarReclamo = registrarReclamo;
window.validarReclamo = validarReclamo;
window.revisarReclamo = revisarReclamo;
window.resolverReclamo = resolverReclamo;
window.registrarContrato = registrarContrato;
window.aprobarContrato = aprobarContrato;
window.handleLogin = handleLogin;
window.handleLogout = handleLogout;

<<<<<<< HEAD
// ============================================================================
// VALIDACIÓN AL SALIR DEL CAMPO — PED-#####-L##
// ============================================================================

const PED_REGEX = /^PED-\d{4,5}-L\d{2}$/;

/**
 * Adjunta validación a un campo PED.
 * Mientras escribe: verde si ya cumple el patrón, neutral si no (sin presión).
 * Al salir del campo (blur): si es incorrecto muestra el error rojo + anima el label.
 * Al volver a escribir tras un error: limpia el rojo y regresa a neutro.
 *
 * @param {string} inputId  - ID del <input>
 * @param {string} errorId  - ID del <span.ped-error-msg>
 */
function bindPedValidation(inputId, errorId) {
  const input   = document.getElementById(inputId);
  const errorEl = document.getElementById(errorId);
  const iconEl  = input ? input.parentElement.querySelector('.ped-status-icon') : null;
  // Buscar el <label> más cercano antes del wrapper, tolerando distintas estructuras DOM
  const wrapper = input ? input.closest('.ped-field-wrapper') : null;
  const labelEl = (function findPrevLabel(el) {
    if (!el) return null;
    let sib = el.previousElementSibling;
    while (sib) {
      if (sib.tagName === 'LABEL') return sib;
      sib = sib.previousElementSibling;
    }
    // Si no hay label hermano, subir un nivel y buscar allí
    return el.parentElement ? findPrevLabel(el.parentElement) : null;
  })(wrapper);

  if (!input || !errorEl) return;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function setNeutral() {
    input.classList.remove('ped-invalid', 'ped-valid');
    errorEl.classList.remove('visible');
    if (iconEl) iconEl.style.opacity = '0';
  }

  function setValid() {
    input.classList.remove('ped-invalid');
    input.classList.add('ped-valid');
    errorEl.classList.remove('visible');
    if (iconEl) {
      iconEl.className = 'ped-status-icon fa-solid fa-circle-check';
      iconEl.style.opacity = '1';
    }
  }

  function setInvalid() {
    input.classList.remove('ped-valid', 'ped-invalid');
    void input.offsetWidth; // reflow para no acumular animación
    input.classList.add('ped-invalid');
    errorEl.classList.add('visible');
    if (iconEl) {
      iconEl.className = 'ped-status-icon fa-solid fa-circle-xmark';
      iconEl.style.opacity = '1';
    }
    // Animar el label: quitar clase, forzar reflow, volver a añadir
    if (labelEl && labelEl.tagName === 'LABEL') {
      labelEl.classList.remove('ped-label-shake');
      void labelEl.offsetWidth;
      labelEl.classList.add('ped-label-shake');
    }
  }

  // ── Mientras escribe: solo verde si ya es válido, si no → neutro ───────────
  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val === '') {
      setNeutral();
    } else if (PED_REGEX.test(val)) {
      setValid();
    } else {
      // Si había un error visible, limpiar para no presionar mientras corrige
      input.classList.remove('ped-invalid', 'ped-valid');
      errorEl.classList.remove('visible');
      if (iconEl) iconEl.style.opacity = '0';
    }
  });

  // ── Al salir del campo: validación completa ─────────────────────────────────
  input.addEventListener('blur', () => {
    const val = input.value.trim();
    if (val === '')      { setNeutral(); return; }
    if (PED_REGEX.test(val)) { setValid();   return; }
    setInvalid();
  });
}

function initPedValidation() {
  bindPedValidation('r-cliente',  'r-cliente-error');
  bindPedValidation('rc-pedido',  'rc-pedido-error');
}

=======
>>>>>>> e922001734046aa6b906cbae6d07fb73dfaf0d31

// ============================================================================
// GESTIÓN DE POLÍTICAS Y COOKIES
// ============================================================================

window.toggleLoginBtn = function() {
  const checkbox = document.getElementById('policy-checkbox');
  const btn = document.getElementById('login-submit-btn');
  if (!checkbox || !btn) return;
  btn.disabled = !checkbox.checked;
};

window.openPolicyModal = function() {
  const overlay = document.getElementById('policy-modal-overlay');
  if (overlay) overlay.style.display = 'flex';
};

window.closePolicyModal = function(event, force = false) {
  const overlay = document.getElementById('policy-modal-overlay');
  if (!overlay) return;
  if (force || (event && event.target === overlay)) {
    overlay.style.display = 'none';
  }
};

window.acceptPolicyFromModal = function() {
  const checkbox = document.getElementById('policy-checkbox');
  if (checkbox) {
    checkbox.checked = true;
    window.toggleLoginBtn();
  }
  localStorage.setItem('policiesAccepted', 'true');
  localStorage.setItem('cookiesConsent', JSON.stringify({ esenciales: true, rendimiento: true, preferencias: true }));
  window.closePolicyModal(null, true);
  
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
};

window.showCookieOptions = function() {
  const optionsPanel = document.getElementById('cookie-options');
  const actionButtons = document.getElementById('cookie-action-buttons');
  if (optionsPanel) optionsPanel.style.display = 'block';
  if (actionButtons) actionButtons.style.display = 'none';
};

window.acceptAllCookies = function() {
  const preferences = { esenciales: true, rendimiento: true, preferencias: true };
  localStorage.setItem('cookiesConsent', JSON.stringify(preferences));
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
};

window.saveCookiePreferences = function() {
  const perf = document.getElementById('cookie-perf') ? document.getElementById('cookie-perf').checked : true;
  const pref = document.getElementById('cookie-pref') ? document.getElementById('cookie-pref').checked : true;
  const preferences = { esenciales: true, rendimiento: perf, preferencias: pref };
  localStorage.setItem('cookiesConsent', JSON.stringify(preferences));
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
};

function checkCookieConsent() {
  const consent = localStorage.getItem('cookiesConsent');
  const banner = document.getElementById('cookie-banner');
  if (!consent && banner) {
    banner.style.display = 'flex';
  }
}

// ============================================================================
// INICIALIZACIÃ“N
// ============================================================================

function init() {
  const auth = window.firebaseAuth;
  const db = window.db;
  if (!auth || !db) return;

  // Verificar consentimiento de cookies
  checkCookieConsent();

<<<<<<< HEAD
  // Activar validación en tiempo real para campos PED-#####-L##
  initPedValidation();

=======
>>>>>>> e922001734046aa6b906cbae6d07fb73dfaf0d31
  // Intervalo para actualizar tiempos en la UI cada 30 segundos
  setInterval(() => {
    renderAll();
  }, 30000);

  // Cargar estado previo de políticas aceptadas si existe
  const accepted = localStorage.getItem('policiesAccepted');
  if (accepted) {
    const checkbox = document.getElementById('policy-checkbox');
    if (checkbox) {
      checkbox.checked = true;
      window.toggleLoginBtn();
    }
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Intentar obtener rol
      let role = 'consulta';
      try {
        let docSnap = await getDoc(doc(db, "usuarios", user.uid));
        if (docSnap.exists()) {
          role = docSnap.data().rol;
        } else {
          docSnap = await getDoc(doc(db, "usuarios", user.email));
          if (docSnap.exists()) {
            role = docSnap.data().rol;
          }
        }
      } catch (e) {
        console.error("Error loading user role from Firestore:", e);
      }
      state.userRole = role;
      showApp(user, role);
    } else {
      showLogin();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}