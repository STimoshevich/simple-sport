import {storeKeyResolver} from './store-key-resolver.util';

describe('storeKeyResolver', () => {
    describe('базовые поля', () => {
        it('возвращает name как есть', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.name).toBe('proposal');
        });

        it('возвращает capitalizedName с заглавной первой буквой', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.capitalizedName).toBe('Proposal');
        });

        it('isDefault=true когда name совпадает с defaultName', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.isDefault).toBe(true);
        });

        it('isDefault=false когда name отличается от defaultName', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.isDefault).toBe(false);
        });

        it('privateKey всегда содержит ведущий _', () => {
            const defaultKeys = storeKeyResolver('data', 'data');
            const customKeys = storeKeyResolver('proposal', 'data');

            expect(defaultKeys.privateKey).toBe('_data');
            expect(customKeys.privateKey).toBe('_proposal');
        });
    });

    describe('privateSuffixed — приватный, префикс перед именем', () => {
        it('для дефолтного имени возвращает _<prefix>', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.privateSuffixed('update')).toBe('_update');
            expect(keys.privateSuffixed('reload')).toBe('_reload');
        });

        it('для кастомного имени возвращает _<prefix><Name>', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.privateSuffixed('update')).toBe('_updateProposal');
            expect(keys.privateSuffixed('reload')).toBe('_reloadProposal');
        });
    });

    describe('publicSuffixed — публичный, префикс перед именем', () => {
        it('для дефолтного имени возвращает <prefix>', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.publicSuffixed('update')).toBe('update');
            expect(keys.publicSuffixed('reload')).toBe('reload');
        });

        it('для кастомного имени возвращает <prefix><Name>', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.publicSuffixed('update')).toBe('updateProposal');
            expect(keys.publicSuffixed('reload')).toBe('reloadProposal');
        });
    });

    describe('privateTrailingSuffixed — приватный, суффикс после имени', () => {
        it('для дефолтного имени возвращает _<suffix>', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.privateTrailingSuffixed('meta')).toBe('_meta');
            expect(keys.privateTrailingSuffixed('changes')).toBe('_changes');
        });

        it('для кастомного имени возвращает _<name><Suffix>', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.privateTrailingSuffixed('meta')).toBe('_proposalMeta');
            expect(keys.privateTrailingSuffixed('changes')).toBe('_proposalChanges');
        });

        it('капитализирует суффикс при кастомном имени', () => {
            const keys = storeKeyResolver('user', 'data');

            expect(keys.privateTrailingSuffixed('ids')).toBe('_userIds');
            expect(keys.privateTrailingSuffixed('byId')).toBe('_userById');
        });
    });

    describe('publicTrailingSuffixed — публичный, суффикс после имени', () => {
        it('для дефолтного имени возвращает <suffix>', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.publicTrailingSuffixed('meta')).toBe('meta');
        });

        it('для кастомного имени возвращает <name><Suffix>', () => {
            const keys = storeKeyResolver('proposal', 'data');

            expect(keys.publicTrailingSuffixed('meta')).toBe('proposalMeta');
        });

        it('капитализирует суффикс при кастомном имени', () => {
            const keys = storeKeyResolver('user', 'data');

            expect(keys.publicTrailingSuffixed('view')).toBe('userView');
        });
    });

    describe('privateInfixed — приватный, имя между префиксом и суффиксом', () => {
        it('для дефолтного имени возвращает _<prefix><suffix>', () => {
            const keys = storeKeyResolver('entity', 'entity');

            expect(keys.privateInfixed('get', 'ById')).toBe('_getById');
            expect(keys.privateInfixed('has', 'Id')).toBe('_hasId');
        });

        it('для кастомного имени возвращает _<prefix><Name><suffix>', () => {
            const keys = storeKeyResolver('proposal', 'entity');

            expect(keys.privateInfixed('get', 'ById')).toBe('_getProposalById');
            expect(keys.privateInfixed('has', 'Id')).toBe('_hasProposalId');
        });

        it('не модифицирует регистр суффикса', () => {
            const keys = storeKeyResolver('user', 'entity');

            // 'ById' остаётся 'ById', не превращается в 'byId'
            expect(keys.privateInfixed('get', 'ById')).toBe('_getUserById');
            // 'BySlug' остаётся 'BySlug'
            expect(keys.privateInfixed('find', 'BySlug')).toBe('_findUserBySlug');
        });
    });

    describe('publicInfixed — публичный, имя между префиксом и суффиксом', () => {
        it('для дефолтного имени возвращает <prefix><suffix>', () => {
            const keys = storeKeyResolver('entity', 'entity');

            expect(keys.publicInfixed('get', 'ById')).toBe('getById');
            expect(keys.publicInfixed('has', 'Id')).toBe('hasId');
        });

        it('для кастомного имени возвращает <prefix><Name><suffix>', () => {
            const keys = storeKeyResolver('proposal', 'entity');

            expect(keys.publicInfixed('get', 'ById')).toBe('getProposalById');
            expect(keys.publicInfixed('has', 'Id')).toBe('hasProposalId');
        });

        it('не модифицирует регистр суффикса', () => {
            const keys = storeKeyResolver('user', 'entity');

            expect(keys.publicInfixed('get', 'ById')).toBe('getUserById');
            expect(keys.publicInfixed('find', 'BySlug')).toBe('findUserBySlug');
        });
    });

    describe('разные defaultName', () => {
        it('правильно определяет isDefault для defaultName=entity', () => {
            const keys = storeKeyResolver('entity', 'entity');

            expect(keys.isDefault).toBe(true);
            expect(keys.privateTrailingSuffixed('ids')).toBe('_ids');
            expect(keys.publicInfixed('get', 'ById')).toBe('getById');
        });

        it('правильно определяет isDefault для defaultName=data', () => {
            const keys = storeKeyResolver('data', 'data');

            expect(keys.isDefault).toBe(true);
            expect(keys.privateSuffixed('update')).toBe('_update');
        });

        it('одинаковое name даёт разный результат при разном defaultName', () => {
            const asDefault = storeKeyResolver('proposal', 'proposal');
            const asCustom = storeKeyResolver('proposal', 'data');

            expect(asDefault.isDefault).toBe(true);
            expect(asCustom.isDefault).toBe(false);

            expect(asDefault.privateSuffixed('update')).toBe('_update');
            expect(asCustom.privateSuffixed('update')).toBe('_updateProposal');
        });
    });

    describe('edge cases', () => {
        it('обрабатывает односимвольное имя', () => {
            const keys = storeKeyResolver('x', 'data');

            expect(keys.capitalizedName).toBe('X');
            expect(keys.privateKey).toBe('_x');
            expect(keys.privateSuffixed('update')).toBe('_updateX');
            expect(keys.privateTrailingSuffixed('meta')).toBe('_xMeta');
            expect(keys.publicInfixed('get', 'ById')).toBe('getXById');
        });

        it('обрабатывает имя из нескольких camelCase-слов', () => {
            const keys = storeKeyResolver('proposalHistory', 'data');

            expect(keys.capitalizedName).toBe('ProposalHistory');
            expect(keys.privateKey).toBe('_proposalHistory');
            expect(keys.privateSuffixed('update')).toBe('_updateProposalHistory');
            expect(keys.privateTrailingSuffixed('meta')).toBe('_proposalHistoryMeta');
            expect(keys.publicInfixed('get', 'ById')).toBe('getProposalHistoryById');
        });

        it('правильно работает когда name уже начинается с заглавной (необычный случай)', () => {
            const keys = storeKeyResolver('Proposal', 'data');

            // Capitalize<'Proposal'> = 'Proposal', результат тот же
            expect(keys.capitalizedName).toBe('Proposal');
            expect(keys.privateSuffixed('update')).toBe('_updateProposal');
        });
    });
});
