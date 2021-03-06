/*  control.js

    Copyright (c) 2013-2016, Reactive Sets

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as
    published by the Free Software Foundation, either version 3 of the
    License, or (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
undefine()( 'control', [ '../core/pipelet' ], function( rs ) {
  'use strict';
  
  var RS       = rs.RS
    , log      = RS.log
    , subclass = RS.subclass
    , Ordered  = RS.Ordered
    
    , extend   = RS.extend
    , is_DOM   = RS.is_DOM
  ;
  
  /* -------------------------------------------------------------------------------------------
     de&&ug()
  */
  var de = false, ug = de && log.bind( null, 'control' );
  
  /* -------------------------------------------------------------------------------------------
     Control()
  */
  function Control( dom_node, options ) {
    Ordered.call( this, options );
    
    this._set_node( dom_node, options );
  } // Control()
  
  Ordered.subclass( 'Control', Control, {
    _set_node: function( dom_node ) {
      if( is_DOM( dom_node ) ) {
        this._$node = dom_node;
      } else {
        throw( "node is not a DOM element" );
      }
    }, // _set_node()
    
    _get_control_name: function() {
      return this._options.control_name || this._$node.id;
    } // _get_control_name()
  } ); // Control()
  
  /* -------------------------------------------------------------------------------------------
     Single_Choice()
  */
  function Single_Choice( dom_node, options ) {
    var that = this;
    
    Control.call( that, dom_node, options );
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    that._value = null;
    
    function fetch_unfiltered( receiver ) {
      var v = that._value;
      
      receiver( v ? [ v ] : [], true );
    } // fetch_unfiltered()
  } // Single_Choice()
  
  Control.subclass( 'Single_Choice', Single_Choice, {
    _add: function( added, options ) {
      var previous = this._value;
      
      this.insert_at( added, options );
      
      var v = this._get_value();
      
      if ( previous !== v ) {
        if ( previous ) {
          // ToDo: provide test
          this.__emit_update( [ [ previous, v ] ] );
        } else {
          this.__emit_add( [ v ] );
        }
      }
      
      return this;
    }, // _add()
    
    _remove: function( removed, options ) {
      var previous = this._value;
      
      this.remove_from( removed, options );
      
      var v = this._get_value();
      
      if ( previous !== v ) {
        v ? this.__emit_update( [ [ previous, v ] ] ) : this.__emit_remove( [ previous ] );
      }
      
      return this;
    }, // _remove()
    
    _update: function( updates, options ) {
      var previous = this._value;
      
      this.update_from_to( updates, options );
      
      var v = this._get_value();
      
      if ( previous !== v ) {
        if ( previous ) {
          if ( v ) {
            this.__emit_update( [ [ previous, v ] ] );
          } else {
            // ToDo: provide test
            this.__emit_remove( [ previous ] );
          }
        } else {
          // ToDo: provide test
          this.__emit_add( [ v ] );
        }
      }
      
      return this;
    } // _update()
  } ); // Single_Choice()
  
  /* -------------------------------------------------------------------------------------------
     Multiple_Choice()
  */
  function Multiple_Choice( dom_node, options ) {
    var that = this;
    
    Control.call( that, dom_node, options );
    
    that._values = [];
    
    that._output.fetch_unfiltered = fetch_unfiltered;
    
    function fetch_unfiltered( receiver ) {
      receiver( that._values, true );
    } // fetch_unfiltered()
  } // Multiple_Choice()
  
  Control.subclass( 'Multiple_Choice', Multiple_Choice, {
    _add: function( added, options ) {
      var previous = this._values;
      
      this.insert_at( added, options );
      
      var values = this._get_values();
      
      if( previous ) this.__emit_remove( previous );
      
      this.__emit_add( values );
    }, // _add()
    
    _remove: function( removed, options ) {
      var previous = this._values;
      
      this.remove_from( removed, options );
      
      var values = this._get_values();
      
      if( previous.length ) this.__emit_remove( previous );
      if( values.length   ) this.__emit_add   ( values   );
    }, // _remove()
    
    _update: function( updates, options ) {
      var previous = this._values;
      
      this.update_from_to( updates, options );
      
      var values = this._get_values();
      
      if( previous.length ) this.__emit_remove( previous );
      if( values.length   ) this.__emit_add   ( values   );
    } // _update()
  } ); // Multiple_Choice()
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox()
     
     Parameters:
      - dom_node : a DOM element where the checkbox control will be inserted
      
      - options  : an optional object 
         - label: the control label, it will be replaced by 'value.label' if not provided. Default : an empty string
         - control_name : the control name. Default : a string generated by _get_control_name()
         - selected : the checkbox stat true ( checked ) or false ( unchecked ). Default : false
  */
  Control.Checkbox = function( dom_node, options ) {
    de&&ug( 'new Checkbox()' );
    
    this._options = options = extend( { selected_value: false }, options );
    
    Single_Choice.call( this, dom_node, options );
  }; // Control.Checkbox()
  
  Single_Choice.Build( 'checkbox', Control.Checkbox, {
    _set_node: function( dom_node ) {
      if( ! is_DOM( dom_node ) )
        throw( "node is not a DOM element" )
      ;
      
      dom_node.innerHTML = '<input type="checkbox" /><label></label>';
      
      this._$node = dom_node;
      
      var that      = this
        , $checkbox = this._$checkbox = dom_node.querySelector( 'input' )
        , $label    = this._$label    = dom_node.querySelector( 'label' )
      ;
      
      $checkbox.name     = this._get_control_name();
      $checkbox.checked  = this._options.selected_value;
      $checkbox.disabled = true;
      $checkbox.onclick  = click;
      
      function click() {
        var previous = that._value
          , value    = that._get_value()
        ;
        
        that._$label.innerHTML = that._options.label || value.label;
        
        if( previous !== value ) {
          previous ? that.__emit_update( [ [ previous, value ] ] ) : that.__emit_add( [ value ] );
        }
      } // click()
    }, // _set_node()
    
    _get_value: function() {
      var a = this.a
        , l = a.length
        , v = a[ this._a_index_of( { id: this._$checkbox.checked } ) ]
      ;
      
      de&&ug( "Checkbox(), _get_value(), value", v );
      
      this._$checkbox.disabled = a.length < 2;
      
      return this._value = v;
    }, // _get_value()
    
    // ToDo: add leading underscore to insert_, remove_, update_, also consider changing these names see order.js
    insert_: function( at, value ) {
      // ToDo: add test for non-boolean id
      if( typeof value.id !== "boolean" ) throw( "Only boolean values are allowed" );
      
      var l = this.a.length;
      
      // ToDo: not sure if this test is necessary
      // because we update the value after _add(), _remove() or update
      if( l === 2 ) return this;
      
      var options        = this._options
        , selected_value = options.selected_value
        , value_id       = value.id
        , is_selected    = selected_value === value_id
      ;
      
      if( l === 0 || is_selected ) {
        this._$checkbox.checked = value_id;
        this._$label.innerHTML  = options.label || value.label || '';
      }
      
      Single_Choice.prototype.insert_.call( this, at, value );
      
      return this;
    }, // insert_()
    
    remove_: function( from, value ) {
      Single_Choice.prototype.remove_.call( this, from, value );
      
      var a = this.a;
      
      this._$checkbox.checked = a.length ? a[ 0 ].id : false;
      this._$label.innerHTML  = a.length ? this._options.label || a[ 0 ].label : "";
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      Single_Choice.prototype.update_.call( this, at, value );
      
      var u = value[ 1 ]
        , v = this._value
      ;
      
      if( v.id    !== u.id    ) this._$checkbox.checked = u.id;
      if( v.label !== u.label ) this._$label.innerHTML  = this._options.label || u.label || '';
      
      return this;
    } // update_()
  } ); // Control.Checkbox()
  
  /* -------------------------------------------------------------------------------------------
     Control.Drop_Down()
  */
  Control.Drop_Down = function( dom_node, options ) {
    de&&ug( 'new Drop_Down()' );
    
    this._options = options = extend( {}, options );
    
    Single_Choice.call( this, dom_node, options );
  }; // Control.Drop_Down()
  
  Single_Choice.Build( 'drop_down', Control.Drop_Down, {
    _set_node: function( dom_node ) {
      if( ! is_DOM( dom_node ) )
        throw( 'node is not a DOM element' )
      ;
      
      this._$node = dom_node;
      
      var that    = this
        , $select = document.createElement( 'select' )
      ;
      
      $select.name     = this._get_control_name();
      $select.onchange = change;
      
      dom_node.appendChild( this._$select = $select );
      
      function change() {
        var previous = that._value
          , value    = that._get_value()
        ;
        
        if( previous !== value ) {
          previous ? that.__emit_update( [ [ previous, value ] ] ) : that.__emit_add( [ value ] );
        }
      } // chnage()
    }, // _set_node()
    
    _get_value : function() {
      var a  = this.a
        , $s = this._$select
        , v  = a[ $s.selectedIndex ]
      ;
      
      if( ! this._value && ! ( v && v.selected ) ) v = a[ $s.selectedIndex = 0 ];
      
      de&&ug( 'Drop_Down..get_value(), value:', v );
      
      return this._value = v;
    }, // _get_value()
    
    insert_: function( at, value ) {
      var $select = this._$select
        , $option = document.createElement( 'option' )
      ;
      
      $option.innerHTML = value.label || value.id;
      $option.value     = value.id;
      
      if( value.selected ) $option.selected = true;
      
      $select.insertBefore( $option, $select.childNodes[ at ] || null );
      
      Single_Choice.prototype.insert_.call( this, at, value );
      
      return this;
    }, // insert_()
    
    remove_: function( from , value ) {
      this._$select.remove( from );
      
      Single_Choice.prototype.remove_.call( this, from, value )
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var $option = this._$select.options[ at ]
        , u0  = value[ 0 ]
        , u1  = value[ 1 ]
      ;
      
      
      if( u0.id    !== u1.id    ) $option.value     = u1.id;
      if( u0.label !== u1.label ) $option.innerHTML = u1.label;
      
      if( u1.selected ) $option.selected = true;
      
      Single_Choice.prototype.update_.call( this, at, value )
      
      return this;
    } // update_()
  } ); // Control.Drop_Down()
  
  /* -------------------------------------------------------------------------------------------
     Control.Radio()
  */
  Control.Radio = function( dom_node, options ) {
    de&&ug( 'new Radio()' );
    
    Single_Choice.call( this, dom_node, options );
  }; // Control.Radio()
  
  Single_Choice.Build( 'radio', Control.Radio, {
    _get_value: function() {
      var $inputs = this._$node.getElementsByTagName( 'input' )
        , a       = this.a
        , v
      ;
      
      for( var i = $inputs.length; i; ) {
        if( ! $inputs[ --i ].checked ) continue;
        
        v = a[ i ];
        
        break;
      }
      
      de&&ug( '_get_value(), value:', v );
      
      return this._value = v;
    }, // get_value(): 
    
    insert_: function( at, value ) {
      var that   = this
        , $node  = this._$node
        , id     = value.id // object id
        , name   = this._get_control_name() // control name
        , $div   = document.createElement( 'div'   )
        , $input = document.createElement( 'input' )
        , $label = document.createElement( 'label' )
      ;
      
      $label.innerHTML = value.label || id;
      
      $input.id      = name + '-' + id;
      $input.name    = name;
      $input.type    = 'radio';
      $input.value   = id;
      $input.onclick = click;
      
      $div.appendChild( $input );
      $div.appendChild( $label );
      
      if( value.selected ) $input.checked = true;
      
      $node.insertBefore( $div, $node.childNodes[ at ] || null );
      
      Single_Choice.prototype.insert_.call( this, at, value )
      
      return this;
      
      function click() {
        var previous = that._value
          , value    = that._get_value()
        ;
        
        if( previous !== value ) {
          previous ? that.__emit_update( [ [ previous, value ] ] ) : that.__emit_add( [ value ] );
        }
      }
    }, // insert_()
    
    remove_: function( from , value ) {
      var u, $node = this._$node;
      
      $node.removeChild( $node.childNodes[ from ] );
      
      Single_Choice.prototype.remove_.call( this, from, value )
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var $div = this._$node.childNodes[ at ]
        , u0   = value[ 0 ]
        , u1   = value[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) $div.firstChild.value    = u1.id;
      if( u0.label !== u1.label ) $div.lastChild.innerHTML = u1.label;
      
      if( u1.selected ) $div.firstChild.checked = true;
      
      Single_Choice.prototype.update_.call( this, at, value )
      
      return this;
    } // update_()
  } ); // Control.Radio()
  
  /* -------------------------------------------------------------------------------------------
     Control.Checkbox_Group()
  */
  Control.Checkbox_Group = function( node, options ) {
    de&&ug( 'new Checkbox_Group()' );
    
    Multiple_Choice.call( this, node, options );
  }; // Control.Checkbox_Group()
  
  Multiple_Choice.Build( 'checkbox_group', Control.Checkbox_Group, {
    _get_values: function() {
      var $inputs = this._$node.querySelectorAll( 'input' )
        , a       = this.a
        , values  = []
        , i       = $inputs.length
      ;
      
      while ( i )
        if ( $inputs[ --i ].checked )
          values.unshift( a[ i ] );
      
      de&&ug( '_get_values(), values:', values );
      
      return this._values = values;
    }, // _get_values()
    
    insert_: function( at, value ) {
      var that   = this
        , $node  = this._$node
        , id     = value.id // object id
        , name   = this._get_control_name() // control name
        , $div   = document.createElement( 'div'   )
        , $label = document.createElement( 'label' )
        , $input = document.createElement( 'input' )
      ;
      
      $input.id    = name + '-' + id;
      $input.name  = name;
      $input.type  = 'checkbox';
      $input.value = value.id;
      
      $label.innerHTML = value.label || id;
      
      $input.onchange = click;
      
      $div.appendChild( $input );
      $div.appendChild( $label );
      
      if( value.selected ) $input.checked = true;
      
      $node.insertBefore( $div, $node.childNodes[ at ] || null );
      
      Multiple_Choice.prototype.insert_.call( this, at, value );
      
      return this;
      
      function click() {
        var v = that.a[ that._a_index_of( { id : to_value( this.value ) } ) ];
        
        that._get_values();
        
        this.checked ? that.__emit_add( [ v ] ) : that.__emit_remove( [ v ] );
      }
    }, // insert_()
    
    remove_: function( from, value ) {
      var $node = this._$node;
      
      $node.removeChild( $node.childNodes[ from ] );
      
      Multiple_Choice.prototype.remove_.call( this, from, value );
      
      return this;
    }, // remove_()
    
    update_: function( at, value ) {
      var $div = this._$node.childNodes[ at ]
        , u0  = value[ 0 ]
        , u1  = value[ 1 ]
      ;
      
      if( u0.id    !== u1.id    ) $div.firstChild.value    = u1.id;
      if( u0.label !== u1.label ) $div.lastChild.innerHTML = u1.label;
      
      $div.firstChild.checked = u1.selected;
      
      Multiple_Choice.prototype.update_.call( this, at, value );
      
      return this
    } // update_()
  } ); // Control.Checkbox_Group()
  
  function to_value( v ) {
    return isNaN( parseInt( v ) ) ? v : parseInt( v );
  }
  
  /* -------------------------------------------------------------------------------------------
     module exports
  */
  RS.add_exports( { 'Control' : Control } );
  
  de&&ug( 'module loaded' );
  
  return rs;
} ); // control.js
