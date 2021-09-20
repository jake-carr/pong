export default class randomScreenNameGenerator {
    private animals = [
        'Bug',
        'Bee',
        'Dog',
        'Cat',
        'Pug',
        'Bird',
        'Fish',
        'Frog',
        'Snake',
        'Koala',
        'Tapir',
        'Tiger',
        'Whale',
        'Zebra',
        'Insect',
        'Octopus',
        'Giraffe',
        'Elephant',
        'Capybara',
        'Anteater',
    ];
    private descriptors = [
        'Big',
        'Cool',
        'Zany',
        'Swell',
        'Great',
        'Jaunty',
        'Social',
        'Elegant',
        'Ancient',
        'Strange',
        'Electric',
        'Reclusive',
        'Brilliant',
        'Incredible',
        'Astounding',
        'Intelligent',
        'Inquisitive',
    ];

    constructor() {}

    public generateRandomScreenName() {
        let descriptor =
            this.descriptors[
                Math.floor(Math.random() * this.descriptors.length)
            ];
        let animal =
            this.animals[Math.floor(Math.random() * this.animals.length)];

        let screenName: string = descriptor + animal;

        return screenName;
    }
}
