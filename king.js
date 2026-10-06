/**
 * King: a chess king — wide base, collar step, tapering body, cross crown.
 * The tier under the pointer lifts with stagger; the cross answers on the crown.
 */
const {
  Cam, facing, fit, hull, open, poly, proj, prism, put, rad, ringAt, rings, rrect, run,
  tdone, tset, tval, tween, unproj, disposer, mk, place, pointer, reflect, register, flatDot,
} = HL;

const CX = 40, CY = 40, LIFT = 13, TILT = 5;

function tapered(P, front, foot, top, inner, z0, z1) {
  return {
    sil: poly(hull(ringAt(P, foot, z0).concat(ringAt(P, top, z1)))),
    crease: open(ringAt(P, run(inner, front), z1)),
  };
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;

  const C = Cam(45, 0.5, 1.68);
  fit(C, [[10, 10, 0], [70, 70, 0], [70, 10, 0], [10, 70, 0], [33, 33, 58], [47, 47, 58], [40, 40, 0], [40, 40, 55 + LIFT]], 200, 166);
  const P = proj(C), front = facing(C);

  const tiers = [
    { read: "base", x0: 13, y0: 13, x1: 67, y1: 67, z0: 0, z1: 10.5, r: 7.5, b: 2.1 },
    { read: "ring", x0: 23, y0: 23, x1: 57, y1: 57, z0: 10.5, z1: 16.5, r: 4.5, b: 1.5 },
    { read: "body", taper: true, x0: 27, y0: 27, x1: 53, y1: 53, x0t: 32, y0t: 32, x1t: 48, y1t: 48, z0: 16.5, z1: 43, r: 4.2, b: 1.1 },
    { read: "crown", x0: 33.5, y0: 33.5, x1: 46.5, y1: 46.5, z0: 43, z1: 48.5, r: 2.6, b: 0.85 },
  ];

  const g = mk("g", {}, svg);
  const [baseRing] = rings(13, 13, 67, 67, 7.5, 2.1);
  reflect(svg, g, P, front, baseRing, 0, 11);

  const parts = tiers.map((t) => {
    const grp = mk("g", {}, g);
    return { grp, sil: mk("path", { class: "sil" }, grp), cr: mk("path", { class: "nf lo" }, grp), lift: tween(0), t };
  });

  const cross = mk("g", {}, g);
  const vSil = mk("path", { class: "sil" }, cross);
  const vCr = mk("path", { class: "nf lo" }, cross);
  const hSil = mk("path", { class: "sil hi" }, cross);
  const hCr = mk("path", { class: "nf lo" }, cross);
  const mark = flatDot(cross, C, 0.55, "dot m");
  const beads = [0, 1, 2].map(() => mk("circle", { r: 1.05, class: "dot off" }, g));

  function drawTier(part, lift) {
    const t = part.t, z0 = t.z0 + lift, z1 = t.z1 + lift;
    let paths;
    if (t.taper) {
      const foot = rrect(t.x0, t.y0, t.x1, t.y1, t.r, 8);
      const top = rrect(t.x0t, t.y0t, t.x1t, t.y1t, t.r - 1, 8);
      const inner = rrect(t.x0t + t.b, t.y0t + t.b, t.x1t - t.b, t.y1t - t.b, t.r - t.b - 1, 8);
      paths = tapered(P, front, foot, top, inner, z0, z1);
    } else {
      const [ring, inner] = rings(t.x0, t.y0, t.x1, t.y1, t.r, t.b);
      paths = prism(P, front, ring, inner, z0, z1);
    }
    part.sil.setAttribute("d", paths.sil);
    part.cr.setAttribute("d", paths.crease);
  }

  function drawBeads(lift) {
    const z = 16.5 + lift;
    const pts = [
      P(CX - 8, CY + 6, z),
      P(CX, CY + 9, z),
      P(CX + 8, CY + 6, z),
    ];
    beads.forEach((el, k) => place(el, pts[k]));
  }

  function drawCross(lift) {
    const z0 = 48.5 + lift, z1 = 59 + lift, zMid = 54 + lift;
    const [vRing, vIn] = rings(CX - 1.8, CY - 1.8, CX + 1.8, CY + 1.8, 1.2, 0.55);
    const vp = prism(P, front, vRing, vIn, z0, z1);
    vSil.setAttribute("d", vp.sil); vCr.setAttribute("d", vp.crease);
    const [hRing, hIn] = rings(CX - 5.2, CY - 1.3, CX + 5.2, CY + 1.3, 1, 0.5);
    const hp = prism(P, front, hRing, hIn, zMid - 1.2, zMid + 1.2);
    hSil.setAttribute("d", hp.sil); hCr.setAttribute("d", hp.crease);
    place(mark, P(CX + 4.5 * Math.sin(rad(TILT)), CY + 4.5 * Math.cos(rad(TILT)), z1 + 0.4));
  }

  function paint(now) {
    parts.forEach((p) => drawTier(p, tval(p.lift, now)));
    drawBeads(tval(parts[1].lift, now));
    drawCross(tval(parts[3].lift, now));
  }

  function hit([sx, sy]) {
    const [cx, cy] = unproj(C, sx, sy, 59);
    if (Math.hypot(cx - CX, cy - CY) < 7.5) return 3;
    for (let i = tiers.length - 1; i >= 0; i--) {
      const t = tiers[i], z = t.z1;
      const [wx, wy] = unproj(C, sx, sy, z);
      if (wx >= t.x0 && wx <= t.x1 && wy >= t.y0 && wy <= t.y1) return i;
    }
    return -1;
  }

  const B = register(stage, (_dt, now) => {
    paint(now);
    return parts.some((p) => !tdone(p.lift, now));
  });
  bag.add(B.unregister);

  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    parts.forEach((p, i) => {
      tset(p.lift, a === i ? LIFT : 0, now, Math.abs(i - from) * stag);
      p.sil.classList.toggle("hi", i === a);
    });
    beads.forEach((el, k) => {
      el.classList.remove("dot", "m", "off");
      if (a === 1 && k === 1) el.classList.add("dot");
      else el.classList.add("off");
    });
    const crown = a === 3;
    vSil.classList.toggle("hi", crown);
    hSil.classList.toggle("hi", crown || a < 0);
    mark.classList.toggle("dot", crown);
    mark.classList.toggle("m", false);
    mark.classList.toggle("off", !crown);
    read.textContent = a < 0 ? "rest" : tiers[a].read;
    B.wake();
  }

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  paint(performance.now());
  read.textContent = "rest";
  hSil.classList.add("hi");
  mark.classList.add("off");

  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "king",
  means: "A chess king: each tier lifts under the pointer, crowned by a cross that answers on top.",
  rules: [1, 2, 5, 9, 10],
  range: [0, 38, 85],
  mount,
});
