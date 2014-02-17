var App = Ember.Application.create({
  LOG_TRANSITIONS: true
});

/** Routes
 */

App.ApplicationRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('column');
  }
});

App.IndexRoute = Ember.Route.extend({
  model: function() {
    return this.store.findAll('column');
  }
});

/** Views
 */
App.ApplicationView = Ember.View.extend({
  name: Ember.computed.alias('controller.name'),
  
  didInsertElement: function(event) {
    var that = this;
    this.$().find('input').on('keypress', function(e) {
      if (e.which == 13) {
        var val = $(this).val();
        if ($.trim(val).length > 0) {
          that.get('controller').send('createColumn', val);
          that.set('name', '');
        }
        return false;
      }
    });
    
    this.$().find('ul.columns').sortable({
      axis: "y",
      cursor: "move",
      update: function() {
        var ids = [];
        $(this).find('li').each(function(i) {
          var $li = $(this);
          ids.push($li.data('id'));
        });
        
        $(this).sortable('cancel');
        
        that.get('controller').send('sort', ids);
      }
    });
  }
});

/** Controllers
 */

App.ApplicationController = Ember.ArrayController.extend({
  columnName: '',
  sortProperties: ["rank"],
  actions: {
    createColumn: function(name) {
      var last = this.get('lastObject');
      var nextRank;
      if (last) {
        nextRank = (last.get('rank') || 1) + 1
      } else {
        nextRank = 1;
      }
      
      var column = this.store.createRecord('column', {
        name: name,
        rank: nextRank,
        tasks: []
      });
      
      var controller = this;
      column.save().then(function() {
        controller.set('columnName', '')
      });
    },
    
    sort: function(ids) {
      var controller = this;
      $.each(ids, function(rank) {
        var id = this.toString();
        controller.store.find('column', id).then(function(record) {
          record.set('rank', rank);
          record.save();
        });
      });
    },
    
    delete: function(record) {
      record.destroyRecord();
    }
  }
});

App.IndexController = Ember.ArrayController.extend({
  sortProperties: ["rank"]
});

/** Models
 */

App.ApplicationAdapter = DS.FixtureAdapter.extend({});

App.Column = DS.Model.extend({
  name: DS.attr('string'),
  rank: DS.attr('number', {autoincrement: true}),
  tasks: DS.hasMany('task', {async: true})
});

App.Task = DS.Model.extend({
  name: DS.attr('string'),
  rank: DS.attr('number'),
  column: DS.belongsTo('column', {async: true})
});

/** Fixtures
  */

App.Column.FIXTURES = [
  {
    id: 1,
    name: "TODO",
    rank: 1,
    tasks: []
  },
  {
    id: 2,
    name: "Done",
    rank: 2,
    tasks: []
  }
];