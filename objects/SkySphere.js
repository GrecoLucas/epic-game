import SkySphereModel from '../model/SkySphereModel.js';
import SkySphereView from '../view/SkySphereView.js';

class SkySphere {
    constructor(scene) {
        this.model = new SkySphereModel(scene);
        this.view = new SkySphereView(scene, this.model);
    }

    create() {
        this.view.create();
    }
}

export default SkySphere;