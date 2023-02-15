/* eslint-disable func-names */


module.exports = function (array) {
    let items = [];
    if (array) {
        items = array;
    }

    this.add = function (item) {
        items.push(item);
    };

    this.iterator = function () {
        let i = 0;
        return {
            hasNext() {
                return i < items.length;
            },
            next() {
                // eslint-disable-next-line no-plusplus
                return items[i++];
            },
        };
    };

    this.getLength = function () {
        return items.length;
    };

    this.length = this.getLength();

    this.toArray = function () {
        return items;
    };

    this.addAll = function (collection) {
        items = items.concat(collection.toArray());
    };

    this.contains = function (item) {
        return array.indexOf(item) >= 0;
    };

    this.map = function () {
        const args = Array.from();
        let list = args[0];
        const callback = args[1];
        if (list && Object.prototype.hasOwnProperty.call(list, 'toArray')) {
            list = list.toArray();
        }
        return list ? list.map(callback) : [];
    };

    this.get = function (index) {
        return items[index];
    };
};
