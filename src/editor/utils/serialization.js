/**
 * Layer serialization for save/restore and undo system
 */

export function serializeLayer(l) {
    const obj = l.fabricObject;
    const base = {
        id: l.id,
        name: l.name,
        type: l.type,
        visible: l.visible,
        locked: l.locked,
        color: l.color,
        parentId: l.parentId || null,
        anchorX: l.anchorX || 0,
        anchorY: l.anchorY || 0,
    };

    if (!obj) return base;

    base.props = {
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        angle: obj.angle,
        opacity: obj.opacity,
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth,
        rx: obj.rx || 0,
        ry: obj.ry || 0,
        radius: obj.radius || 0,
        flipX: obj.flipX,
        flipY: obj.flipY,
        originX: obj.originX,
        originY: obj.originY,
    };

    if (l.type === 'text' || obj.type === 'i-text') {
        base.props.text = obj.text;
        base.props.fontSize = obj.fontSize;
        base.props.fontFamily = obj.fontFamily;
        base.props.fontWeight = obj.fontWeight;
        base.props.fontStyle = obj.fontStyle;
        base.props.textAlign = obj.textAlign;
    }

    if (obj.path) {
        base.props.pathData = obj.path.map(cmd => [...cmd]);
    }

    if (obj.points) {
        base.props.points = obj.points.map(p => ({ x: p.x, y: p.y }));
    }

    if (obj.type === 'line') {
        base.props.x1 = obj.x1;
        base.props.y1 = obj.y1;
        base.props.x2 = obj.x2;
        base.props.y2 = obj.y2;
    }

    return base;
}

export function serializeLayers(layers) {
    return layers.map(serializeLayer);
}
