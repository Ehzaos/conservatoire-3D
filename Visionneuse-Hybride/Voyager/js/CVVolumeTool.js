;(function() {
  // 1) On attend que le bundle principal ait exposé CVToolProvider et les classes de base
  function ready(fn) {
    if (window.CVToolProvider && window.CVTool) return fn();
    return setTimeout(() => ready(fn), 50);
  }

  ready(function() {
    const { CVToolProvider, CVTool, types, CVModel2, ToolView, html, customElement, THREE } = window;
    if (!CVToolProvider || !CVTool) {
      console.error("Voyager API non trouvée (CVToolProvider/CVTool)");
      return;
    }

    // 2) Définition du nouvel outil
    class CVVolumeTool extends CVTool {
      static typeName = "CVVolumeTool";
      static text     = "Volume";
      static icon     = "3d_rotation";

      constructor(node, id) {
        super(node, id);
        this.ins  = this.addInputs({ model: types.Object("Tool.Model", CVModel2) });
        this.outs = this.addOutputs({ volume: types.Number("Tool.Volume", 0) });
      }

      createView() { return new VolumeToolView(this); }

      update() {
        const root = this.ins.model.value?.object3D;
        this.outs.volume.setValue(root
          ? this.computeMeshVolume(root)
          : 0
        );
        return true;
      }

      computeMeshVolume(root) {
        let volume = 0;
        root.traverse(obj => {
          const mesh = obj;
          if (!mesh.geometry) return;
          const pos = mesh.geometry.attributes.position.array;
          const idx = mesh.geometry.index?.array || null;
          const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
          const count = idx ? idx.length : pos.length / 3;
          for (let i = 0; i < count; i += 3) {
            const ia = idx ? idx[i+0]*3 : i*3;
            const ib = idx ? idx[i+1]*3 : (i+1)*3;
            const ic = idx ? idx[i+2]*3 : (i+2)*3;
            vA.set(pos[ia], pos[ia+1], pos[ia+2]);
            vB.set(pos[ib], pos[ib+1], pos[ib+2]);
            vC.set(pos[ic], pos[ic+1], pos[ic+2]);
            volume += vA.dot(vB.cross(vC)) / 6;
          }
        });
        return Math.abs(volume);
      }
    }

    // 3) Vue associée
    @customElement("sv-volume-tool-view")
    class VolumeToolView extends ToolView {
      render() {
        const vol   = this.tool.outs.volume.value;
        const units = this.activeDocument.root.scene.ins.units.getOptionText();
        return html`<div>Volume : ${vol.toFixed(2)} ${units}³</div>`;
      }
      onClose() {
        this.parentElement.dispatchEvent(new CustomEvent("close"));
      }
    }

    // 4) On injecte le tool dans la liste statique
    CVToolProvider.components.push(CVVolumeTool);
    console.info("CVVolumeTool injecté");
  });
})();