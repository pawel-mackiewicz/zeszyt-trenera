import { v7 as uuidv7 } from 'uuid'

export class Club {
    public readonly id: string
    private _createdAt: Date

    private _name: string
    private _foundingDate: Date

    public constructor(name: string, foundingDate: Date) {
        this.id = uuidv7()
        this._createdAt = new Date()

        this._name = name
        this._foundingDate = foundingDate
    }

    public get name(): string {
        return this._name
    }

    public get foundingDate(): Date {
        return this._foundingDate
    }
}