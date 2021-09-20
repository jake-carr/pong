export default class randomColorPicker {
    private legalColors = [
        '#3DFAFF', // Aqua
        '#AFF9C9', // Mint
        '#D81E5B', // Ruby
        '#A44200', // Rust
        '#DE3F82', // Pink
        '#48BEFF', // Capri
        '#FFC2B4', // Melon
        '#FB8F67', // Coral
        '#F4B860', // Sunray
        '#99AA38', // Citron
        '#53DD6C', // Malachite
        '#C7DBE6', // Beau blue
        '#C83E4D', // Brick red
        '#DB5461', // Indian red
        '#9792E3', // Blue purple
        '#43C59E', // Ocean green
        '#3C32C3', // Persian blue
        '#009F93', // Persian green
        '#F8E16C', // Naples yellow
        '#00C49A', // Caribbean green
        '#C307ED', // Electric purple
    ];

    constructor() {}

    public pickColor() {
        return this.legalColors[
            Math.floor(Math.random() * this.legalColors.length)
        ];
    }
}
