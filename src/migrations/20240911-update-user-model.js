'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { DataTypes } = Sequelize;
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add new columns
      await queryInterface.addColumn('users', 'firstName', {
        type: DataTypes.STRING(50),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'lastName', {
        type: DataTypes.STRING(50),
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'role', {
        type: DataTypes.ENUM('admin', 'author', 'user'),
        defaultValue: 'user',
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('users', 'status', {
        type: DataTypes.ENUM('active', 'pending', 'suspended'),
        defaultValue: 'pending',
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('users', 'profilePicture', {
        type: DataTypes.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'bio', {
        type: DataTypes.TEXT,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'lastLogin', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'loginAttempts', {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }, { transaction });

      await queryInterface.addColumn('users', 'lockUntil', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('users', 'deletedAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });

      // Update existing users to active status if email verification is not required
      if (process.env.REQUIRE_EMAIL_VERIFICATION !== 'true') {
        await queryInterface.bulkUpdate('users', 
          { status: 'active', isVerified: true },
          { isVerified: true },
          { transaction }
        );
      }

      await transaction.commit();
      console.log('User model migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Error in user model migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove all added columns
      await queryInterface.removeColumn('users', 'firstName', { transaction });
      await queryInterface.removeColumn('users', 'lastName', { transaction });
      await queryInterface.removeColumn('users', 'role', { transaction });
      await queryInterface.removeColumn('users', 'status', { transaction });
      await queryInterface.removeColumn('users', 'profilePicture', { transaction });
      await queryInterface.removeColumn('users', 'bio', { transaction });
      await queryInterface.removeColumn('users', 'lastLogin', { transaction });
      await queryInterface.removeColumn('users', 'loginAttempts', { transaction });
      await queryInterface.removeColumn('users', 'lockUntil', { transaction });
      await queryInterface.removeColumn('users', 'deletedAt', { transaction });
      
      // Remove enum types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_status";', { transaction });
      
      await transaction.commit();
      console.log('User model migration reverted successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Error reverting user model migration:', error);
      throw error;
    }
  }
};
