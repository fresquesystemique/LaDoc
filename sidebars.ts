import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  principal: [
    'accueil',
    {
      type: 'category',
      label: 'LeHub',
      link: {type: 'doc', id: 'lehub/index'},
      items: [
        'lehub/fonctionnalites',
        'lehub/architecture',
        'lehub/donnees',
        'lehub/flux',
        'lehub/integrations',
        'lehub/developpement',
        'lehub/deploiement',
      ],
    },
    {
      type: 'doc',
      id: 'lehub/index',
      label: 'Accueil LeHub',
    },
    /*
    {
      type: 'category',
      label: 'LeSite',
      link: {type: 'doc', id: 'lesite/index'},
      items: [
        'lesite/fonctionnalites',
        'lesite/architecture',
        'lesite/donnees',
        'lesite/flux',
        'lesite/integrations',
        'lesite/developpement',
        'lesite/deploiement',
      ],
    },
    {
      type: 'category',
      label: 'LeBoard',
      link: {type: 'doc', id: 'leboard/index'},
      items: [
        'leboard/fonctionnalites',
        'leboard/architecture',
        'leboard/donnees',
        'leboard/flux',
        'leboard/integrations',
        'leboard/developpement',
        'leboard/deploiement',
      ],
    },
    {
      type: 'category',
      label: 'Le SI transverse',
      link: {type: 'doc', id: 'si/index'},
      items: [
        'si/infrastructure',
        'si/environnements',
        'si/monitoring',
        'si/sauvegardes',
        'si/pieges',
      ],
    },
    */
  ],
};

export default sidebars;
